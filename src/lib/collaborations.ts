import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestError } from "./request-error";
import type { MedicalRecord, User } from "./types";
import { isValidClinicPhone } from "./veterinary-contact";

const identifier = z.string().min(1).max(128);
export const collaborationCommands = [
  z.object({ type: z.literal("veterinary.profile"), clinicName: z.string().trim().max(120).default(""), phone: z.string().trim().max(30).refine(isValidClinicPhone, "Escribe un teléfono válido de 10 a 15 dígitos, con lada si corresponde.").default(""), city: z.string().trim().max(100), specialty: z.string().trim().max(120), bio: z.string().trim().max(1000), available: z.boolean() }).strict(),
  z.object({ type: z.literal("collaboration.request"), veterinarianId: identifier, message: z.string().trim().min(10).max(1000) }).strict(),
  z.object({ type: z.literal("collaboration.respond"), id: identifier, accept: z.boolean() }).strict(),
  z.object({ type: z.literal("collaboration.end"), id: identifier }).strict(),
] as const;
export const collaborationCommandSchema = z.discriminatedUnion("type", collaborationCommands);
export type CollaborationCommand = z.input<typeof collaborationCommandSchema>;

export function veterinaryPetFilter(veterinarianId: string): Prisma.PetWhereInput {
  return { shelter: { active: true, role: "REFUGIO", shelterCollaborations: { some: { veterinarianId, status: "ACCEPTED" } } } };
}

export async function auditEvent(transaction: Prisma.TransactionClient, actor: User, action: string, targetId: string, targetName: string, before: Prisma.InputJsonObject, after: Prisma.InputJsonObject) {
  await transaction.auditEvent.create({ data: { actorId: actor.id, actorName: actor.name, actorRole: actor.role, action, targetId, targetName, before, after } });
}

export async function createAuthorizedMedicalRecord(transaction: Prisma.TransactionClient, viewer: User, record: Omit<MedicalRecord, "id" | "veterinarianId" | "veterinarianName" | "createdAt">) {
  const actor = await transaction.user.findUnique({ where: { id: viewer.id } });
  if (!actor?.active || actor.role !== viewer.role || !["ADMIN", "VETERINARIO"].includes(actor.role)) throw new RequestError("Tu cuenta no tiene acceso clínico.", 403);
  const pet = await transaction.pet.findFirst({ where: { id: record.petId, ...(actor.role === "ADMIN" ? {} : veterinaryPetFilter(actor.id)) } });
  if (!pet) throw new RequestError("No tienes una colaboración activa con el refugio de esta mascota.", 403);
  const date = new Date(record.date);
  const nextDate = record.nextDate ? new Date(record.nextDate) : null;
  if (!Number.isFinite(date.getTime()) || nextDate && !Number.isFinite(nextDate.getTime())) throw new RequestError("Fecha inválida.");
  if (nextDate && nextDate < date) throw new RequestError("La próxima cita no puede ser anterior al registro.");
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new RequestError("El registro debe corresponder a una atención ya realizada.");
  await transaction.medicalRecord.create({ data: { ...record, date, nextDate, veterinarianId: actor.id } });
}

export async function executeCollaboration(transaction: Prisma.TransactionClient, viewer: User, action: CollaborationCommand) {
  const actor = await transaction.user.findUnique({ where: { id: viewer.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!actor?.active || actor.role !== viewer.role) throw new RequestError("Tu acceso cambió. Actualiza la página.", 403);
  if (action.type === "veterinary.profile") {
    if (actor.role !== "VETERINARIO") throw new RequestError("Solo los veterinarios pueden publicar su disponibilidad.", 403);
    if (action.available && (!action.city || !action.specialty)) throw new RequestError("Indica ciudad y área de atención antes de aparecer en el directorio.");
    const { type: actionType, ...profile } = action;
    await transaction.veterinaryProfile.upsert({ where: { userId: actor.id }, create: { userId: actor.id, ...profile }, update: profile });
    return;
  }
  if (action.type === "collaboration.request") {
    if (actor.role !== "REFUGIO") throw new RequestError("Solo un refugio puede enviar solicitudes.", 403);
    const veterinarian = await transaction.user.findFirst({ where: { id: action.veterinarianId, role: "VETERINARIO", active: true, veterinaryProfile: { available: true } } });
    if (!veterinarian) throw new RequestError("Este veterinario no está disponible en el directorio.", 409);
    const existing = await transaction.collaboration.findUnique({ where: { shelterId_veterinarianId: { shelterId: actor.id, veterinarianId: veterinarian.id } } });
    if (existing?.status === "PENDING" || existing?.status === "ACCEPTED") throw new RequestError("Ya existe una solicitud pendiente o una colaboración activa.", 409);
    const collaboration = await transaction.collaboration.upsert({
      where: { shelterId_veterinarianId: { shelterId: actor.id, veterinarianId: veterinarian.id } },
      create: { shelterId: actor.id, veterinarianId: veterinarian.id, message: action.message },
      update: { status: "PENDING", message: action.message, createdAt: new Date() },
    });
    await auditEvent(transaction, actor, action.type, collaboration.id, `${actor.name} / ${veterinarian.name}`, { status: existing?.status ?? null }, { status: "PENDING" });
    return;
  }
  const collaboration = await transaction.collaboration.findUnique({ where: { id: action.id }, include: { shelter: true, veterinarian: true } });
  if (!collaboration) throw new RequestError("Solicitud no encontrada.", 404);
  let status: "ACCEPTED" | "REJECTED" | "CANCELLED" | "ENDED";
  if (action.type === "collaboration.respond") {
    if (actor.role !== "VETERINARIO" || collaboration.veterinarianId !== actor.id) throw new RequestError("Solo el veterinario destinatario puede responder.", 403);
    if (collaboration.status !== "PENDING") throw new RequestError("Esta solicitud ya fue atendida o cancelada.", 409);
    if (!collaboration.shelter.active || collaboration.shelter.role !== "REFUGIO") throw new RequestError("El refugio ya no está activo.", 409);
    status = action.accept ? "ACCEPTED" : "REJECTED";
  } else {
    const ownsShelter = actor.role === "REFUGIO" && collaboration.shelterId === actor.id;
    const ownsVeterinarian = actor.role === "VETERINARIO" && collaboration.veterinarianId === actor.id;
    if (!ownsShelter && !ownsVeterinarian && actor.role !== "ADMIN") throw new RequestError("No puedes gestionar esta colaboración.", 403);
    if (collaboration.status !== "PENDING" && collaboration.status !== "ACCEPTED") throw new RequestError("Esta colaboración ya está cerrada.", 409);
    status = collaboration.status === "PENDING" ? "CANCELLED" : "ENDED";
  }
  await transaction.collaboration.update({ where: { id: collaboration.id }, data: { status } });
  await auditEvent(transaction, actor, action.type, collaboration.id, `${collaboration.shelter.name} / ${collaboration.veterinarian.name}`, { status: collaboration.status }, { status });
}
