import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");

const baseUrl = new URL(process.env.PATAMATCH_BASE_URL ?? "http://localhost:3000").origin;
const database = new PrismaClient();
const sessions = new Map();
const runId = randomUUID();
const temporaryEmail = `verification-${runId}@patamatch.test`;
const roleDescription = `Mascota temporal para comprobar protección de roles. Prueba ${runId}`;
const description = `Mascota creada exclusivamente para verificar el recorrido completo de adopción. Identificador de prueba: ${runId}`;
const petInput = {
  name: "Prueba de recorrido",
  species: "perro",
  breed: "Mestizo",
  age: "joven",
  ageYears: 2,
  sex: "hembra",
  size: "pequeno",
  energy: "media",
  personality: ["Sociable", "Cariñosa"],
  children: "apto",
  otherPets: "apto",
  care: "bajo",
  health: "Buen estado general. Registro temporal de verificación.",
  vaccinated: true,
  neutered: true,
  regulated: false,
  description,
  city: "Xalapa",
  image: "/pets/canela.jpg",
  status: "disponible",
};
const demoAccounts = [
  { key: "adoptante", role: "ADOPTANTE", email: "adoptante@patamatch.local" },
  { key: "refugio", role: "REFUGIO", email: "refugio@patamatch.local" },
  { key: "veterinario", role: "VETERINARIO", email: "veterinario@patamatch.local" },
  { key: "admin", role: "ADMIN", email: "admin@patamatch.local" },
];
let assertions = 0;
let createdPetId = null;
let shelterId = null;
let creationAttempted = false;
let temporaryUserId = null;
let rolePetId = null;
let failed = false;

function verify(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`✓ ${assertions}. ${message}`);
}

function updateCookies(session, response) {
  if (!session) return;
  const jar = sessions.get(session) ?? new Map();
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (!value || /max-age=0(?:;|$)/i.test(cookie)) jar.delete(name);
    else jar.set(name, value);
  }
  sessions.set(session, jar);
}

async function request(path, { session, body, origin = baseUrl, method = body === undefined ? "GET" : "POST" } = {}) {
  const headers = { Accept: "application/json" };
  if (method !== "GET") headers.Origin = origin;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session && sessions.has(session)) {
    headers.Cookie = [...sessions.get(session)].map(([name, value]) => `${name}=${value}`).join("; ");
  }
  let response;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      });
      if (response.status !== 429 || !path.startsWith("/api/auth/") || attempt === 3) break;
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
      const retryMilliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter ?? "") - Date.now();
      const delay = Math.max(1000, Math.min(60_000, Number.isFinite(retryMilliseconds) ? retryMilliseconds + 250 : 11_000));
      await response.arrayBuffer();
      console.log(`Límite temporal de acceso: reintentando en ${Math.ceil(delay / 1000)} segundos…`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } catch (error) {
    throw new Error(`No se pudo consultar ${baseUrl}${path}. El servidor debe estar iniciado.`, { cause: error });
  }
  updateCookies(session, response);
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { throw new Error(`${method} ${path} devolvió una respuesta que no es JSON (HTTP ${response.status}).`); }
  return { status: response.status, data };
}

async function expectRequest(path, options, status, message) {
  const result = await request(path, options);
  verify(result.status === status, `${message}: HTTP ${status}${result.status !== status ? `; recibido ${result.status} (${result.data?.error ?? result.data?.message ?? "sin detalle"})` : ""}`);
  return result.data;
}

async function getState(session) {
  return expectRequest("/api/state", { session }, 200, `Estado de ${session ?? "visitante"}`);
}

async function action(session, command, status, message, extra = {}) {
  return expectRequest("/api/action", { session, body: command, ...extra }, status, message);
}

async function main() {
  console.log(`Verificando PataMatch en ${baseUrl}`);
  const anonymous = await getState();
  verify(anonymous.user === null && anonymous.profile === null, "La consulta pública no expone usuario ni perfil");
  for (const key of ["favorites", "applications", "medicalRecords", "users", "reports"]) {
    verify(Array.isArray(anonymous[key]) && anonymous[key].length === 0, `La consulta pública no expone ${key}`);
  }
  await action(undefined, { type: "pet.create", pet: petInput }, 401, "La API exige una sesión para escribir");
  sessions.set("origin-probe", new Map([["patamatch_verification", "probe"]]));
  await expectRequest("/api/auth/sign-out", { session: "origin-probe", body: {}, origin: "https://externo.example" }, 403, "Autenticación rechaza un origen externo con cookie");
  sessions.delete("origin-probe");
  await expectRequest("/api/auth/sign-up/email", { body: { name: "Prueba de contraseña", email: temporaryEmail, password: "aaaaaaaaaa" } }, 400, "El servidor rechaza una contraseña que solo cumple la longitud");

  for (const account of demoAccounts) {
    await expectRequest("/api/auth/sign-in/email", { session: account.key, body: { email: account.email, password: "PataMatch2026!" } }, 200, `Inicio de sesión ${account.key}`);
    verify((sessions.get(account.key)?.size ?? 0) > 0, `La sesión de ${account.key} recibe su propia cookie`);
    const state = await getState(account.key);
    verify(state.user?.role === account.role && state.user?.email === account.email, `El servidor reconoce el rol ${account.role}`);
    if (account.key === "refugio") shelterId = state.user.id;
    if (account.key === "adoptante") verify(state.profile?.completed === true, "La cuenta demo adoptante conserva su test completo");
  }

  const registered = await expectRequest("/api/auth/sign-up/email", { session: "temporary", body: { name: "Cuenta temporal de verificación", email: temporaryEmail, password: "Bosque!7Sol9" } }, 200, "Registro con política de contraseña compartida");
  temporaryUserId = registered.user.id;
  const registeredState = await getState("temporary");
  verify(registeredState.user?.role === "ADOPTANTE" && registeredState.profile === null, "Una cuenta nueva comienza como adoptante sin test inventado");
  await action("admin", { type: "user.role", id: temporaryUserId, role: "REFUGIO" }, 200, "Administración cambia el rol de una cuenta sin responsabilidades");
  await action("temporary", { type: "pet.create", pet: { ...petInput, name: "Prueba de protección de roles", species: "otro", vaccinated: false, neutered: false, description: roleDescription } }, 200, "El refugio temporal registra otra especie con cuidados pendientes");
  const roleState = await getState("temporary");
  const rolePet = roleState.pets.find(pet => pet.shelterId === temporaryUserId && pet.description === roleDescription);
  verify(Boolean(rolePet), "La mascota de protección de roles pertenece a la cuenta temporal");
  rolePetId = rolePet.id;
  verify(rolePet.species === "otro" && !rolePet.vaccinated && !rolePet.neutered, "La API conserva la especie y los datos de salud sin inventar estados completos");
  await action("admin", { type: "user.role", id: temporaryUserId, role: "ADOPTANTE" }, 409, "No se retira el rol de un refugio con mascotas registradas");
  verify((await getState("temporary")).user?.role === "REFUGIO", "El bloqueo de cambio de rol conserva al responsable de la mascota");

  await action("adoptante", { type: "pet.create", pet: petInput }, 403, "Un adoptante no puede registrar mascotas");
  await action("refugio", { type: "pet.create", pet: petInput }, 403, "Se rechaza una escritura desde un origen externo", { origin: "https://externo.example" });
  creationAttempted = true;
  await action("refugio", { type: "pet.create", pet: petInput }, 200, "El refugio registra una mascota de prueba");
  const shelter = await getState("refugio");
  const created = shelter.pets.filter((pet) => pet.name === petInput.name && pet.description === description && pet.shelterId === shelterId);
  verify(created.length === 1, "La mascota creada tiene un identificador único y pertenece al refugio");
  createdPetId = created[0].id;

  await action("adoptante", { type: "favorite.toggle", petId: createdPetId }, 200, "El adoptante guarda la mascota en favoritos");
  const favoriteState = await getState("adoptante");
  verify(favoriteState.favorites.includes(createdPetId), "El favorito persiste al consultar el servidor");
  const reloadedFavorites = await getState("adoptante");
  verify(reloadedFavorites.favorites.includes(createdPetId), "El favorito persiste en una segunda consulta independiente");

  const applicationCommand = {
    type: "application.create",
    petId: createdPetId,
    motivation: "Quiero ofrecer un hogar responsable y seguro, acompañar su adaptación y cubrir todos sus cuidados durante su vida.",
    phone: "2281234567",
    commitment: true,
  };
  await action("adoptante", applicationCommand, 200, "El adoptante envía una solicitud responsable");
  const applicant = await getState("adoptante");
  const application = applicant.applications.find((item) => item.petId === createdPetId);
  verify(Boolean(application?.id && application?.folio?.startsWith("PM-")), "La solicitud conserva su identificador y folio");
  verify(application.status === "enviada" && application.events.some((event) => event.status === "enviada"), "La solicitud inicia con un evento persistente");
  verify(application.profileSnapshot?.completed === true && application.matchingSnapshot?.factors.length === 7, "La solicitud devuelve el test y los siete factores conservados al enviarla");
  const responsibleShelter = await getState("refugio");
  verify(responsibleShelter.applications.some(item => item.id === application.id && item.profileSnapshot?.completed && item.matchingSnapshot?.factors.length === 7), "El refugio responsable recibe el perfil y la compatibilidad de su solicitante");
  verify(!(await getState("temporary")).applications.some(item => item.id === application.id), "Otro refugio no recibe las respuestas ni la solicitud ajena");
  await action("temporary", { type: "application.status", id: application.id, status: "en_revision", note: "No debe permitirse modificar la solicitud de otro refugio." }, 403, "Otro refugio tampoco puede actualizar la solicitud ajena");
  await action("adoptante", applicationCommand, 409, "Se impide una solicitud activa duplicada");
  await action("veterinario", { type: "application.status", id: application.id, status: "en_revision", note: "Prueba de permisos; este cambio debe rechazarse." }, 403, "El veterinario no puede gestionar solicitudes de adopción");

  const transitions = ["en_revision", "entrevista", "visita", "aprobada", "adoptada"];
  for (const status of transitions) {
    await action("refugio", { type: "application.status", id: application.id, status, note: `Verificación del recorrido: ${status}.` }, 200, `El refugio avanza la solicitud a ${status}`);
  }
  const adoptedState = await getState("adoptante");
  const completed = adoptedState.applications.find((item) => item.id === application.id);
  verify(completed?.status === "adoptada", "El adoptante ve la adopción completada");
  verify(completed?.events.length === 6 && ["enviada", ...transitions].every((status, index) => completed.events[index]?.status === status), "El historial conserva los seis estados del proceso en orden");
  verify(adoptedState.pets.find((pet) => pet.id === createdPetId)?.status === "adoptado", "La mascota cambia a adoptada al completar la solicitud");

  const date = new Date();
  const medicalDate = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 7);
  const nextDate = date.toISOString().slice(0, 10);
  const notes = `Revisión general de integración, sin alteraciones. Seguimiento en siete días. Prueba ${runId}`;
  await action("veterinario", { type: "medical.create", record: { petId: createdPetId, kind: "revision", notes, date: medicalDate, nextDate } }, 200, "El veterinario registra una revisión y su próximo seguimiento");
  const clinicalState = await getState("veterinario");
  const record = clinicalState.medicalRecords.find((item) => item.petId === createdPetId && item.notes === notes);
  verify(record?.date === medicalDate && record?.nextDate === nextDate, "La atención médica y la próxima fecha persisten en el expediente");
  verify(record?.veterinarianId === clinicalState.user.id, "El expediente identifica al veterinario que registró la atención");

  const admin = await getState("admin");
  verify(admin.users.length >= 4 && demoAccounts.every((account) => admin.users.some((user) => user.email === account.email && user.role === account.role)), "La administración puede consultar las cuatro cuentas demo y sus roles");
}

async function cleanup() {
  const temporaryUser = await database.user.findUnique({ where: { email: temporaryEmail }, select: { id: true, email: true } });
  if (temporaryUser?.email === temporaryEmail) {
    temporaryUserId = temporaryUser.id;
    const rolePet = await database.pet.findFirst({ where: { shelterId: temporaryUser.id, description: roleDescription }, select: { id: true } });
    if (rolePet) {
      rolePetId = rolePet.id;
      await database.pet.delete({ where: { id: rolePetId } });
    }
    await database.user.delete({ where: { id: temporaryUser.id } });
    verify(await database.user.count({ where: { email: temporaryEmail } }) === 0, "La cuenta y la mascota temporales de roles se eliminan sin tocar cuentas existentes");
  }
  if (!createdPetId && creationAttempted && shelterId) {
    const candidate = await database.pet.findFirst({ where: { name: petInput.name, description, shelterId }, select: { id: true } });
    createdPetId = candidate?.id ?? null;
  }
  if (createdPetId) {
    await database.$transaction(async (transaction) => {
      const pet = await transaction.pet.findUnique({ where: { id: createdPetId } });
      assert.ok(pet && pet.name === petInput.name && pet.description === description && pet.shelterId === shelterId, "La limpieza sólo puede borrar la mascota creada en esta ejecución.");
      await transaction.favorite.deleteMany({ where: { petId: createdPetId } });
      await transaction.adoptionApplication.deleteMany({ where: { petId: createdPetId } });
      await transaction.medicalRecord.deleteMany({ where: { petId: createdPetId } });
      await transaction.pet.delete({ where: { id: createdPetId } });
    });
    verify(await database.pet.count({ where: { id: createdPetId } }) === 0, "Limpieza completada: sólo se elimina la mascota temporal y sus registros relacionados");
  }
  for (const account of demoAccounts) {
    if (!sessions.get(account.key)?.size) continue;
    const result = await request("/api/auth/sign-out", { session: account.key, body: {} });
    if (result.status !== 200) throw new Error(`No se pudo cerrar la sesión temporal de ${account.key} (HTTP ${result.status}).`);
  }
}

try {
  await main();
} catch (error) {
  failed = true;
  console.error(`✗ Verificación fallida: ${error.message}`);
} finally {
  try { await cleanup(); }
  catch (error) { failed = true; console.error(`✗ Limpieza incompleta: ${error.message}`); }
  await database.$disconnect();
}

console.log(`${failed ? "Verificación incompleta" : "Verificación correcta"}: ${assertions} comprobaciones satisfactorias.`);
process.exitCode = failed ? 1 : 0;
