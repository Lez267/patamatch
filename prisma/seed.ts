import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { calculateMatch } from "../src/lib/matching";
import { defaultProfile, type LifestyleProfile, type Pet } from "../src/lib/types";

if (existsSync(".env")) process.loadEnvFile(".env");

const database = new PrismaClient();
const demoProfile: LifestyleProfile = { ...defaultProfile, completed: true, experience: "intermedia", space: "grande", budget: "alto" };
const shelterId = "demo-refugio";
const shelterName = "Refugio Huellitas Xalapa";
const seededDate = new Date("2026-10-19T12:00:00.000Z");

const pets: Pet[] = [
  {
    id: "demo-canela", name: "Canela", species: "perro", breed: "Mestiza", age: "joven", ageYears: 2,
    sex: "hembra", size: "mediano", energy: "alta", personality: ["Cariñosa", "Juguetona", "Sociable"],
    children: "apto", otherPets: "apto", care: "bajo", health: "Sana. Vacunas al día y desparasitada.",
    vaccinated: true, neutered: true, regulated: false,
    description: "Canela convierte cualquier paseo en una aventura. Es cariñosa, aprende rápido y disfruta acompañarte al parque. Busca una familia que comparta su energía y le dé un hogar para siempre.",
    city: "Xalapa", image: "/pets/canela.jpg", shelterId, shelterName, status: "disponible", createdAt: seededDate.toISOString(),
  },
  {
    id: "demo-rocky", name: "Rocky", species: "perro", breed: "Cruza tipo pitbull", age: "adulto", ageYears: 4,
    sex: "macho", size: "grande", energy: "alta", personality: ["Leal", "Inteligente", "Activo"],
    children: "supervision", otherPets: "depende", care: "medio", health: "Sano. Requiere actividad y manejo responsable.",
    vaccinated: true, neutered: true, regulated: true,
    description: "Rocky disfruta aprender y caminar con su persona de confianza. Necesita espacio, experiencia y una presentación cuidadosa con otros animales. El refugio acompaña su adaptación y revisa los requisitos de manejo.",
    city: "Xalapa", image: "/pets/rocky.jpg", shelterId, shelterName, status: "disponible", createdAt: seededDate.toISOString(),
  },
  {
    id: "demo-luna", name: "Luna", species: "gato", breed: "Doméstica de pelo corto", age: "joven", ageYears: 1.5,
    sex: "hembra", size: "pequeno", energy: "media", personality: ["Curiosa", "Dulce", "Independiente"],
    children: "supervision", otherPets: "depende", care: "bajo", health: "Sana. Pruebas felinas negativas y vacunas al día.",
    vaccinated: true, neutered: true, regulated: false,
    description: "A Luna le encanta descubrir rincones soleados y observar el mundo desde una ventana protegida. Busca un hogar tranquilo, seguro y con tiempo para jugar. Necesita una introducción gradual a otras mascotas.",
    city: "Xalapa", image: "/pets/luna.jpg", shelterId, shelterName, status: "disponible", createdAt: seededDate.toISOString(),
  },
  {
    id: "demo-mimi", name: "Mimi", species: "gato", breed: "Doméstica de pelo largo", age: "senior", ageYears: 9,
    sex: "hembra", size: "pequeno", energy: "baja", personality: ["Tranquila", "Afectuosa", "Gentil"],
    children: "apto", otherPets: "apto", care: "alto", health: "Control renal estable. Requiere dieta y controles veterinarios periódicos.",
    vaccinated: true, neutered: true, regulated: false,
    description: "Mimi prefiere las tardes tranquilas, las cobijas suaves y las caricias. Su cuidado renal necesita compromiso y seguimiento veterinario. Tiene mucho cariño por compartir con una familia que valore su ritmo.",
    city: "Xalapa", image: "/pets/mimi.jpg", shelterId, shelterName, status: "disponible", createdAt: seededDate.toISOString(),
  },
  {
    id: "demo-toby", name: "Toby", species: "perro", breed: "Mestizo", age: "cachorro", ageYears: 0.5,
    sex: "macho", size: "pequeno", energy: "alta", personality: ["Juguetón", "Curioso", "Alegre"],
    children: "apto", otherPets: "apto", care: "medio", health: "Sano. Esquema de vacunación en seguimiento; esterilización programada.",
    vaccinated: false, neutered: false, regulated: false,
    description: "Toby está descubriendo el mundo y necesita compañía, paciencia y educación amable. Le encantan los juguetes y aprende con facilidad. Su futura familia debe completar sus vacunas y el compromiso de esterilización.",
    city: "Coatepec", image: "/pets/toby.jpg", shelterId, shelterName, status: "disponible", createdAt: seededDate.toISOString(),
  },
  {
    id: "demo-coco", name: "Coco", species: "perro", breed: "Mestizo", age: "adulto", ageYears: 5,
    sex: "macho", size: "mediano", energy: "baja", personality: ["Tranquilo", "Compañero", "Noble"],
    children: "apto", otherPets: "no", care: "bajo", health: "Sano. Vacunado y esterilizado.",
    vaccinated: true, neutered: true, regulated: false,
    description: "Coco es un compañero tranquilo que disfruta los paseos cortos y estar cerca de su familia. Busca ser la única mascota de la casa. Con paciencia y una rutina estable, se convierte en un amigo inseparable.",
    city: "Xalapa", image: "/pets/coco.jpg", shelterId, shelterName, status: "disponible", createdAt: seededDate.toISOString(),
  },
];

async function main() {
  const existingDemoAdopter = await database.user.findUnique({ where: { id: "demo-adoptante" }, select: { id: true } });
  const password = await hashPassword("PataMatch2026!");
  const users = [
    { id: "demo-adoptante", name: "Andrea Martínez", email: "adoptante@patamatch.local", role: "ADOPTANTE" as const },
    { id: shelterId, name: shelterName, email: "refugio@patamatch.local", role: "REFUGIO" as const },
    { id: "demo-veterinario", name: "Dra. Elena Torres", email: "veterinario@patamatch.local", role: "VETERINARIO" as const },
    { id: "demo-admin", name: "Administración PataMatch", email: "admin@patamatch.local", role: "ADMIN" as const },
  ];
  for (const user of users) {
    await database.user.upsert({ where: { id: user.id }, create: { ...user, emailVerified: true, active: true }, update: {} });
    await database.account.upsert({ where: { id: `${user.id}-credential` }, create: { id: `${user.id}-credential`, providerId: "credential", accountId: user.id, userId: user.id, password }, update: {} });
  }
  await database.profile.upsert({ where: { userId: "demo-adoptante" }, create: { userId: "demo-adoptante", data: { ...demoProfile } }, update: {} });
  for (const pet of pets) {
    const { shelterName: _shelterName, createdAt, ...data } = pet;
    await database.pet.upsert({ where: { id: pet.id }, create: { ...data, createdAt: new Date(createdAt) }, update: {} });
  }
  if (!existingDemoAdopter) {
    for (const petId of ["demo-canela", "demo-luna"]) {
      await database.favorite.upsert({ where: { userId_petId: { userId: "demo-adoptante", petId } }, create: { userId: "demo-adoptante", petId }, update: {} });
    }
  }
  const applications = [
    { id: "demo-application-luna", folio: "PM-2026-001", petId: "demo-luna", status: "en_revision", date: "2026-10-17T15:00:00.000Z", motivation: "Quiero ofrecer a Luna un hogar seguro, con ventanas protegidas y tiempo diario de juego. Me comprometo a cubrir sus necesidades y a acompañar su adaptación." },
    { id: "demo-application-toby", folio: "PM-2026-002", petId: "demo-toby", status: "entrevista", date: "2026-10-18T16:30:00.000Z", motivation: "Trabajo desde casa y puedo acompañar a Toby durante su crecimiento. Tengo un plan para completar sus vacunas, esterilización y educación con refuerzo positivo." },
  ];
  for (const application of applications) {
    const pet = pets.find((candidate) => candidate.id === application.petId)!;
    const events = [
      { status: "enviada", note: "Solicitud recibida por el refugio.", at: new Date(application.date) },
      { status: "en_revision", note: "El refugio está revisando el test y los datos de contacto.", at: new Date("2026-10-19T09:00:00.000Z") },
      ...(application.status === "entrevista" ? [{ status: "entrevista", note: "Entrevista inicial programada. El refugio confirmará el horario por teléfono.", at: new Date("2026-10-19T11:00:00.000Z") }] : []),
    ];
    await database.adoptionApplication.upsert({ where: { id: application.id }, create: {
      id: application.id, folio: application.folio, petId: application.petId, adopterId: "demo-adoptante",
      status: application.status, motivation: application.motivation, phone: "228 123 4567", commitment: true,
      profileSnapshot: { ...demoProfile }, matchingSnapshot: JSON.parse(JSON.stringify(calculateMatch(pet, demoProfile))),
      createdAt: new Date(application.date), events: { create: events },
    }, update: {} });
  }
  const medicalRecords = [
    { id: "demo-med-canela", petId: "demo-canela", kind: "revision", notes: "Exploración general sin alteraciones. Peso adecuado. Continuar actividad física diaria y prevención de parásitos.", date: "2026-10-15", nextDate: "2027-04-15" },
    { id: "demo-med-luna", petId: "demo-luna", kind: "vacuna", notes: "Aplicación de refuerzo de vacuna triple felina. Sin reacción inmediata. Cartilla actualizada.", date: "2026-10-16", nextDate: "2027-10-16" },
    { id: "demo-med-mimi", petId: "demo-mimi", kind: "tratamiento", notes: "Seguimiento renal estable. Mantener dieta prescrita e hidratación. Control de laboratorio en un mes.", date: "2026-10-18", nextDate: "2026-11-18" },
    { id: "demo-med-toby", petId: "demo-toby", kind: "vacuna", notes: "Primera dosis del esquema de cachorro. Refuerzo pendiente; evitar zonas de alto riesgo hasta completar el esquema.", date: "2026-10-12", nextDate: "2026-11-02" },
  ];
  for (const record of medicalRecords) {
    await database.medicalRecord.upsert({ where: { id: record.id }, create: { ...record, veterinarianId: "demo-veterinario", date: new Date(record.date), nextDate: new Date(record.nextDate) }, update: {} });
  }
  await database.report.upsert({ where: { id: "demo-report-rocky" }, create: { id: "demo-report-rocky", petId: "demo-rocky", reason: "Revisar que la ficha incluya todos los requisitos de manejo responsable y convivencia." }, update: {} });
  await database.report.upsert({ where: { id: "demo-report-toby" }, create: { id: "demo-report-toby", petId: "demo-toby", reason: "Verificar fecha del próximo refuerzo de vacunación.", status: "resuelto" }, update: {} });
  console.log("Demo lista: 4 cuentas, 6 mascotas y datos persistentes de ejemplo. Contraseña: PataMatch2026!");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await database.$disconnect(); });
