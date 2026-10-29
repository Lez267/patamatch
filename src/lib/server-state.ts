import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "./auth";
import { db } from "./db";
import { calculateMatch, canTransitionApplication, isActiveApplication } from "./matching";
import { collaborationCommands, collaborationCommandSchema, createAuthorizedMedicalRecord, executeCollaboration, veterinaryPetFilter } from "./collaborations";
import { executeAccountAdministration } from "./account-administration";
import { RequestError } from "./request-error";
export { RequestError } from "./request-error";
import type { AppState, AdoptionApplication, ApplicationStatus, LifestyleProfile, MedicalRecord, Pet, Role, User } from "./types";

const sizeSchema = z.enum(["pequeno", "mediano", "grande"]);
const speciesSchema = z.enum(["perro", "gato", "otro"]);
const ageSchema = z.enum(["cachorro", "joven", "adulto", "senior"]);
const energySchema = z.enum(["baja", "media", "alta"]);
const levelSchema = z.enum(["bajo", "medio", "alto"]);
const statusSchema = z.enum(["enviada", "en_revision", "entrevista", "visita", "aprobada", "rechazada", "adoptada", "cancelada"]);
const identifierSchema = z.string().min(1).max(128);
const textSchema = (maximum: number) => z.string().trim().min(1).max(maximum);

function isValidPetImage(image: string): boolean {
  if (/^\/pets\/[a-z0-9_.-]+\.(jpe?g|png|webp)$/i.test(image)) return true;
  if (image.startsWith("https://")) {
    try { return new URL(image).protocol === "https:" && !/\s/.test(image); } catch { return false; }
  }
  const dataUrl = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!dataUrl) return false;
  const data = Buffer.from(dataUrl[2], "base64");
  if (data.length > 2 * 1024 * 1024 || data.toString("base64") !== dataUrl[2]) return false;
  if (dataUrl[1] === "jpeg") return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (dataUrl[1] === "png") return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
}

export const profileSchema = z.object({
  housing: z.enum(["casa", "departamento"]), yard: z.boolean(), space: sizeSchema,
  rental: z.boolean(), permission: z.boolean(), children: z.boolean(), youngChildren: z.boolean(),
  otherPets: z.array(speciesSchema).max(3), experience: z.enum(["ninguna", "basica", "intermedia", "avanzada"]),
  hoursAway: z.number().min(0).max(24), backupCare: z.boolean(), allergies: z.boolean(), activity: energySchema,
  species: z.enum(["perro", "gato", "otro", "cualquiera"]), size: z.enum(["pequeno", "mediano", "grande", "cualquiera"]),
  age: z.enum(["cachorro", "joven", "adulto", "senior", "cualquiera"]), budget: levelSchema,
  city: textSchema(100), completed: z.boolean(),
}).strict().refine((profile) => !profile.youngChildren || profile.children, { message: "Si hay niños pequeños, indica también que hay niños en el hogar." });

const petSchema = z.object({
  name: textSchema(80), species: speciesSchema, breed: textSchema(100), age: ageSchema,
  ageYears: z.number().min(0).max(50), sex: z.enum(["hembra", "macho"]), size: sizeSchema, energy: energySchema,
  personality: z.array(textSchema(60)).min(1).max(12), children: z.enum(["apto", "supervision", "no"]),
  otherPets: z.enum(["apto", "depende", "no"]), care: levelSchema, health: textSchema(2000),
  vaccinated: z.boolean(), neutered: z.boolean(), regulated: z.boolean(), description: textSchema(5000), city: textSchema(100),
  image: z.string().max(2_800_000).refine(isValidPetImage, "Usa una imagen JPEG, PNG o WebP de hasta 2 MB, una imagen local de /pets/ o una URL HTTPS."),
  status: z.enum(["disponible", "en_proceso", "adoptado", "pausado"]),
}).strict();

const dateSchema = z.string().max(40).refine((date) => /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) && Number.isFinite(Date.parse(date)), "Fecha inválida.");

const matchingSnapshotSchema = z.object({
  score: z.number().min(0).max(100).nullable(), eligible: z.boolean(),
  reasons: z.array(z.string()), manualReview: z.boolean(),
  factors: z.array(z.object({ key: z.string(), label: z.string(), weight: z.number(), score: z.number().min(0).max(100) })),
});

export const commandSchema = z.discriminatedUnion("type", [
  ...collaborationCommands,
  z.object({ type: z.literal("profile.save"), profile: profileSchema }).strict(),
  z.object({ type: z.literal("favorite.toggle"), petId: identifierSchema }).strict(),
  z.object({ type: z.literal("application.create"), petId: identifierSchema, motivation: z.string().trim().min(30).max(3000), phone: z.string().trim().regex(/^[0-9]{10}$/, "Escribe un teléfono de 10 dígitos."), commitment: z.boolean() }).strict(),
  z.object({ type: z.literal("application.status"), id: identifierSchema, status: statusSchema, note: z.string().trim().max(2000) }).strict().refine((action) => action.status !== "rechazada" || action.note.length >= 8, { message: "Explica el motivo del rechazo en al menos 8 caracteres." }),
  z.object({ type: z.literal("pet.create"), pet: petSchema }).strict(),
  z.object({ type: z.literal("pet.update"), id: identifierSchema, changes: petSchema.partial().refine((changes) => Object.keys(changes).length > 0, "Incluye al menos un cambio.") }).strict(),
  z.object({ type: z.literal("medical.create"), record: z.object({ petId: identifierSchema, kind: z.enum(["revision", "vacuna", "tratamiento"]), notes: textSchema(5000), date: dateSchema, nextDate: dateSchema.nullable() }).strict() }).strict(),
  z.object({ type: z.literal("user.toggle"), id: identifierSchema }).strict(),
  z.object({ type: z.literal("user.role"), id: identifierSchema, role: z.enum(["ADOPTANTE", "REFUGIO", "VETERINARIO", "ADMIN"]) }).strict(),
  z.object({ type: z.literal("report.resolve"), id: identifierSchema }).strict(),
  z.object({ type: z.literal("demo.reset") }).strict(),
]);

type PetRow = Prisma.PetGetPayload<{ include: { shelter: { select: { name: true } } } }>;

export function serializePet(pet: PetRow): Pet {
  return {
    id: pet.id, name: pet.name, species: pet.species as Pet["species"], breed: pet.breed,
    age: pet.age as Pet["age"], ageYears: pet.ageYears, sex: pet.sex as Pet["sex"], size: pet.size as Pet["size"],
    energy: pet.energy as Pet["energy"], personality: pet.personality, children: pet.children as Pet["children"],
    otherPets: pet.otherPets as Pet["otherPets"], care: pet.care as Pet["care"], health: pet.health,
    vaccinated: pet.vaccinated, neutered: pet.neutered, regulated: pet.regulated, description: pet.description,
    city: pet.city, image: pet.image, shelterId: pet.shelterId, shelterName: pet.shelter.name,
    status: pet.status as Pet["status"], createdAt: pet.createdAt.toISOString(),
  };
}

export async function getViewer(headers: Headers): Promise<User | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user?.active) throw new RequestError("Esta cuenta está desactivada. Contacta a la administración.", 403);
  return user;
}

export async function getServerState(headers: Headers): Promise<AppState> {
  const user = await getViewer(headers);
  const publishedFilter: Prisma.PetWhereInput = { status: { not: "pausado" }, shelter: { active: true, role: "REFUGIO" } };
  const petFilter: Prisma.PetWhereInput = user?.role === "ADMIN" ? {} : user?.role === "VETERINARIO" ? veterinaryPetFilter(user.id) : user?.role === "REFUGIO" ? { OR: [publishedFilter, { shelterId: user.id }] } : user?.role === "ADOPTANTE" ? { OR: [publishedFilter, { applications: { some: { adopterId: user.id } } }] } : publishedFilter;
  const applicationFilter: Prisma.AdoptionApplicationWhereInput | null = !user ? null : user.role === "ADMIN" ? {} : user.role === "REFUGIO" ? { pet: { shelterId: user.id } } : user.role === "ADOPTANTE" ? { adopterId: user.id } : null;
  const canReadMedical = user?.role === "ADMIN" || user?.role === "VETERINARIO" || user?.role === "REFUGIO";
  const collaborationFilter: Prisma.CollaborationWhereInput | null = user?.role === "ADMIN" ? {} : user?.role === "REFUGIO" ? { shelterId: user.id } : user?.role === "VETERINARIO" ? { veterinarianId: user.id } : null;
  const [pets, profile, favorites, applications, medicalRecords, users, reports, veterinaryProfile, veterinarians, collaborations, auditEvents] = await Promise.all([
    db.pet.findMany({ where: petFilter, include: { shelter: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    user?.role === "ADOPTANTE" ? db.profile.findUnique({ where: { userId: user.id } }) : null,
    user?.role === "ADOPTANTE" ? db.favorite.findMany({ where: { userId: user.id, pet: publishedFilter }, select: { petId: true } }) : [],
    applicationFilter ? db.adoptionApplication.findMany({ where: applicationFilter, include: { adopter: { select: { name: true, email: true } }, events: { orderBy: { at: "asc" } } }, orderBy: { createdAt: "desc" } }) : [],
    canReadMedical ? db.medicalRecord.findMany({ where: user?.role === "ADMIN" ? {} : { pet: user?.role === "VETERINARIO" ? veterinaryPetFilter(user.id) : { shelterId: user!.id } }, include: { veterinarian: { select: { name: true } } }, orderBy: { date: "desc" } }) : [],
    user?.role === "ADMIN" ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { createdAt: "asc" } }) : [],
    user?.role === "ADMIN" ? db.report.findMany({ select: { id: true, petId: true, reason: true, status: true }, orderBy: { createdAt: "desc" } }) : [],
    user?.role === "VETERINARIO" ? db.veterinaryProfile.findUnique({ where: { userId: user.id }, select: { clinicName: true, phone: true, city: true, specialty: true, bio: true, available: true } }) : null,
    user?.role === "REFUGIO" ? db.user.findMany({ where: { role: "VETERINARIO", active: true, veterinaryProfile: { available: true } }, select: { id: true, name: true, email: true, veterinaryProfile: { select: { clinicName: true, phone: true, city: true, specialty: true, bio: true, available: true } } }, orderBy: { name: "asc" } }) : [],
    collaborationFilter ? db.collaboration.findMany({ where: collaborationFilter, include: { shelter: { select: { name: true, email: true, active: true, role: true } }, veterinarian: { select: { name: true, email: true, active: true, role: true } } }, orderBy: { updatedAt: "desc" } }) : [],
    user?.role === "ADMIN" ? db.auditEvent.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 200 }) : [],
  ]);
  const parsedProfile = profileSchema.safeParse(profile?.data);
  return {
    user, pets: pets.map(serializePet), profile: parsedProfile.success ? parsedProfile.data : null,
    favorites: favorites.map((favorite) => favorite.petId),
    applications: applications.map((application): AdoptionApplication => {
      const profileSnapshot = profileSchema.safeParse(application.profileSnapshot);
      const matchingSnapshot = matchingSnapshotSchema.safeParse(application.matchingSnapshot);
      return {
      id: application.id, folio: application.folio, petId: application.petId, adopterId: application.adopterId,
      adopterName: application.adopter.name, adopterEmail: application.adopter.email, status: application.status as ApplicationStatus,
      motivation: application.motivation, phone: application.phone, createdAt: application.createdAt.toISOString(),
      profileSnapshot: profileSnapshot.success ? profileSnapshot.data : null,
      matchingSnapshot: matchingSnapshot.success ? matchingSnapshot.data : null,
      events: application.events.map((event) => ({ status: event.status as ApplicationStatus, note: event.note, at: event.at.toISOString() })),
      };
    }),
    medicalRecords: medicalRecords.map((record): MedicalRecord => ({ id: record.id, petId: record.petId, veterinarianId: record.veterinarianId, veterinarianName: record.veterinarian.name, kind: record.kind as MedicalRecord["kind"], notes: record.notes, date: record.date.toISOString().slice(0, 10), nextDate: record.nextDate?.toISOString().slice(0, 10) ?? null, createdAt: record.createdAt.toISOString() })),
    users, reports: reports.map((report) => ({ ...report, status: report.status as "pendiente" | "resuelto" })),
    veterinaryProfile,
    veterinarians: veterinarians.map((veterinarian) => ({ id: veterinarian.id, name: veterinarian.name, email: veterinarian.email, ...veterinarian.veterinaryProfile! })),
    collaborations: collaborations.map((collaboration) => ({ id: collaboration.id, shelterId: collaboration.shelterId, shelterName: collaboration.shelter.name, shelterEmail: collaboration.shelter.email, veterinarianId: collaboration.veterinarianId, veterinarianName: collaboration.veterinarian.name, veterinarianEmail: collaboration.veterinarian.email, status: collaboration.status, message: collaboration.message, createdAt: collaboration.createdAt.toISOString(), updatedAt: collaboration.updatedAt.toISOString(), participantsActive: collaboration.shelter.active && collaboration.shelter.role === "REFUGIO" && collaboration.veterinarian.active && collaboration.veterinarian.role === "VETERINARIO" })),
    auditEvents: auditEvents.map((event) => ({ id: event.id, actorId: event.actorId, actorName: event.actorName, actorRole: event.actorRole, action: event.action, targetId: event.targetId, targetName: event.targetName, before: event.before as Record<string, unknown>, after: event.after as Record<string, unknown>, createdAt: event.createdAt.toISOString() })),
  };
}

function requireRole(user: User, roles: Role[]) {
  if (!roles.includes(user.role)) throw new RequestError("Tu cuenta no tiene permiso para realizar esta acción.", 403);
}

async function serializable<Result>(operation: (transaction: Prisma.TransactionClient) => Promise<Result>): Promise<Result> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new RequestError("Hubo otra actualización simultánea. Intenta de nuevo.", 409);
}

export async function executeCommand(headers: Headers, input: unknown): Promise<void> {
  const command = commandSchema.safeParse(input);
  if (!command.success) throw new RequestError(command.error.issues[0]?.message ?? "Datos inválidos.");
  const user = await getViewer(headers);
  if (!user) throw new RequestError("Inicia sesión para continuar.", 401);
  const action = command.data;
  const collaborationAction = collaborationCommandSchema.safeParse(action);
  if (collaborationAction.success) {
    await serializable((transaction) => executeCollaboration(transaction, user, collaborationAction.data));
    return;
  }

  if (action.type === "profile.save") {
    requireRole(user, ["ADOPTANTE"]);
    await db.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, data: action.profile }, update: { data: action.profile } });
    return;
  }
  if (action.type === "favorite.toggle") {
    requireRole(user, ["ADOPTANTE"]);
    await serializable(async (transaction) => {
      const pet = await transaction.pet.findFirst({ where: { id: action.petId, status: { not: "pausado" }, shelter: { active: true, role: "REFUGIO" } } });
      if (!pet) throw new RequestError("Esta mascota ya no está publicada.", 404);
      const favorite = await transaction.favorite.findUnique({ where: { userId_petId: { userId: user.id, petId: action.petId } } });
      if (favorite) await transaction.favorite.delete({ where: { userId_petId: { userId: user.id, petId: action.petId } } });
      else await transaction.favorite.create({ data: { userId: user.id, petId: action.petId } });
    });
    return;
  }
  if (action.type === "application.create") {
    requireRole(user, ["ADOPTANTE"]);
    if (!action.commitment) throw new RequestError("Debes aceptar el compromiso de adopción responsable.");
    await serializable(async (transaction) => {
      const pet = await transaction.pet.findFirst({ where: { id: action.petId, status: "disponible", shelter: { active: true, role: "REFUGIO" } }, include: { shelter: { select: { name: true } } } });
      if (!pet) throw new RequestError("Esta mascota no está disponible para nuevas solicitudes.", 409);
      const profile = await transaction.profile.findUnique({ where: { userId: user.id } });
      const parsedProfile = profileSchema.safeParse(profile?.data);
      if (!parsedProfile.success || !parsedProfile.data.completed) throw new RequestError("Completa tu test de estilo de vida antes de enviar una solicitud.");
      const match = calculateMatch(serializePet(pet), parsedProfile.data);
      if (!match.eligible) throw new RequestError(match.reasons.join(" "));
      const existing = await transaction.adoptionApplication.findMany({ where: { petId: pet.id, adopterId: user.id }, select: { status: true } });
      if (existing.some((application) => isActiveApplication(application.status) || application.status === "adoptada")) throw new RequestError("Ya tienes una solicitud activa para esta mascota.", 409);
      const rejections = existing.filter((application) => application.status === "rechazada").length;
      if (rejections >= 3) throw new RequestError("Has alcanzado el límite de 3 solicitudes para esta mascota. Te sugerimos explorar otras opciones más afines a tu hogar.", 429);
      const folio = `PM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      await transaction.adoptionApplication.create({ data: {
        folio, petId: pet.id, adopterId: user.id, motivation: action.motivation, phone: action.phone, commitment: true,
        profileSnapshot: parsedProfile.data, matchingSnapshot: match as unknown as Prisma.InputJsonValue,
        events: { create: { status: "enviada", note: match.manualReview ? "Solicitud recibida. El refugio revisará las necesidades de acompañamiento." : "Solicitud recibida por el refugio." } },
      } });
    });
    return;
  }
  if (action.type === "application.status") {
    requireRole(user, ["ADOPTANTE", "REFUGIO", "ADMIN"]);
    await serializable(async (transaction) => {
      const application = await transaction.adoptionApplication.findUnique({ where: { id: action.id }, include: { pet: true } });
      if (!application) throw new RequestError("Solicitud no encontrada.", 404);
      const ownsApplication = user.role === "ADOPTANTE" && application.adopterId === user.id;
      const ownsPet = user.role === "REFUGIO" && application.pet.shelterId === user.id;
      if (user.role !== "ADMIN" && !ownsApplication && !ownsPet) throw new RequestError("No tienes acceso a esta solicitud.", 403);
      if (!canTransitionApplication(application.status as ApplicationStatus, action.status, user.role)) throw new RequestError("Este cambio de estado no está permitido.", 409);
      if (action.status === "aprobada" || action.status === "adoptada") {
        if (application.pet.status === "adoptado" || application.pet.status === "pausado") throw new RequestError("La mascota no está disponible para completar esta adopción.", 409);
        const approved = await transaction.adoptionApplication.findFirst({ where: { petId: application.petId, id: { not: application.id }, status: { in: ["aprobada", "adoptada"] } } });
        if (approved) throw new RequestError("Esta mascota ya tiene otra solicitud aprobada.", 409);
      }
      await transaction.adoptionApplication.update({ where: { id: application.id }, data: { status: action.status, events: { create: { status: action.status, note: action.note || "Estado actualizado." } } } });
      if (action.status === "aprobada") await transaction.pet.update({ where: { id: application.petId }, data: { status: "en_proceso" } });
      if (action.status === "adoptada") {
        await transaction.pet.update({ where: { id: application.petId }, data: { status: "adoptado" } });
        const remaining = await transaction.adoptionApplication.findMany({ where: { petId: application.petId, id: { not: application.id }, status: { in: ["enviada", "en_revision", "entrevista", "visita"] } }, select: { id: true } });
        for (const other of remaining) await transaction.adoptionApplication.update({ where: { id: other.id }, data: { status: "rechazada", events: { create: { status: "rechazada", note: "El refugio completó la adopción de esta mascota con otra familia." } } } });
      }
      if ((action.status === "cancelada" || action.status === "rechazada") && application.status === "aprobada" && application.pet.status === "en_proceso") await transaction.pet.update({ where: { id: application.petId }, data: { status: "disponible" } });
    });
    return;
  }
  if (action.type === "pet.create") {
    requireRole(user, ["REFUGIO"]);
    if (action.pet.status === "adoptado" || action.pet.status === "en_proceso") throw new RequestError("Publica la mascota como disponible o pausada; su adopción se registra desde las solicitudes.");
    await db.pet.create({ data: { ...action.pet, shelterId: user.id } });
    return;
  }
  if (action.type === "pet.update") {
    requireRole(user, ["REFUGIO", "ADMIN"]);
    await serializable(async (transaction) => {
      const pet = await transaction.pet.findUnique({ where: { id: action.id } });
      if (!pet) throw new RequestError("Mascota no encontrada.", 404);
      if (user.role !== "ADMIN" && pet.shelterId !== user.id) throw new RequestError("Solo el refugio responsable puede editar esta mascota.", 403);
      if (action.changes.status && action.changes.status !== pet.status) {
        if (pet.status === "adoptado" || pet.status === "en_proceso" || action.changes.status === "adoptado" || action.changes.status === "en_proceso") throw new RequestError("Actualiza los estados de adopción desde la solicitud correspondiente.", 409);
      }
      await transaction.pet.update({ where: { id: pet.id }, data: action.changes });
    });
    return;
  }
  if (action.type === "medical.create") {
    requireRole(user, ["VETERINARIO", "ADMIN"]);
    await serializable((transaction) => createAuthorizedMedicalRecord(transaction, user, action.record));
    return;
  }
  if (action.type === "user.toggle" || action.type === "user.role") {
    requireRole(user, ["ADMIN"]);
    await serializable((transaction) => executeAccountAdministration(transaction, user, action));
    return;
  }
  if (action.type === "report.resolve") {
    requireRole(user, ["ADMIN"]);
    const result = await db.report.updateMany({ where: { id: action.id }, data: { status: "resuelto" } });
    if (!result.count) throw new RequestError("Reporte no encontrado.", 404);
    return;
  }
  if (action.type === "demo.reset") {
    requireRole(user, ["ADMIN"]);
    throw new RequestError("Los datos demo se conservan. Consulta la guía del proyecto para restaurar la demostración.", 409);
  }
}
