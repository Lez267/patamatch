import test from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { collaborationCommandSchema, executeCollaboration, veterinaryPetFilter } from "../src/lib/collaborations";
import type { User } from "../src/lib/types";

const shelter: User = { id: "shelter", name: "Refugio del bosque", email: "refugio@example.test", role: "REFUGIO", active: true };
const veterinarian: User = { id: "vet", name: "Elena Torres", email: "vet@example.test", role: "VETERINARIO", active: true };
const administrator: User = { id: "admin", name: "Administración", email: "admin@example.test", role: "ADMIN", active: true };

function fixture(actor: User, status: string | null = null, available = true) {
  const writes: { operation: string; args: any }[] = [];
  const collaboration = status ? { id: "collaboration", shelterId: shelter.id, veterinarianId: veterinarian.id, status, shelter, veterinarian } : null;
  const transaction = {
    user: { findUnique: async () => actor, findFirst: async () => available ? veterinarian : null },
    veterinaryProfile: { upsert: async (args: any) => { writes.push({ operation: "profile", args }); } },
    collaboration: {
      findUnique: async () => collaboration,
      upsert: async (args: any) => { writes.push({ operation: "request", args }); return { id: "collaboration" }; },
      update: async (args: any) => { writes.push({ operation: "status", args }); },
    },
    auditEvent: { create: async (args: any) => { writes.push({ operation: "audit", args }); } },
  };
  return { transaction: transaction as unknown as Prisma.TransactionClient, writes };
}

test("comandos de colaboración rechazan campos extra, mensajes vacíos y estados enviados por cliente", () => {
  assert.equal(collaborationCommandSchema.safeParse({ type: "collaboration.request", veterinarianId: "vet", message: "Apoyo para revisiones" }).success, true);
  for (const command of [
    { type: "collaboration.request", veterinarianId: "vet", message: "corto" },
    { type: "collaboration.request", veterinarianId: "vet", message: "Apoyo para revisiones", status: "ACCEPTED" },
    { type: "collaboration.respond", id: "x", accept: true, shelterId: "otro" },
    { type: "veterinary.profile", city: "Xalapa", specialty: "Medicina", bio: "", available: true, userId: "otro" },
  ]) assert.equal(collaborationCommandSchema.safeParse(command).success, false);
});

test("el filtro clínico exige refugio activo con rol correcto y aceptación del veterinario exacto", () => {
  assert.deepEqual(veterinaryPetFilter("vet-1"), { shelter: { active: true, role: "REFUGIO", shelterCollaborations: { some: { veterinarianId: "vet-1", status: "ACCEPTED" } } } });
});

test("solo veterinarios activos pueden publicar disponibilidad con datos mínimos", async () => {
  const command = { type: "veterinary.profile" as const, city: "Xalapa", specialty: "Medicina general", bio: "Atención preventiva", available: true };
  const valid = fixture(veterinarian);
  await executeCollaboration(valid.transaction, veterinarian, command);
  assert.equal(valid.writes[0].args.create.userId, veterinarian.id);
  for (const actor of [shelter, administrator, { ...veterinarian, active: false }]) {
    const invalid = fixture(actor);
    await assert.rejects(executeCollaboration(invalid.transaction, actor, command));
    assert.equal(invalid.writes.length, 0);
  }
  const invalid = fixture(veterinarian);
  await assert.rejects(executeCollaboration(invalid.transaction, veterinarian, { ...command, city: "" }));
});

test("crear solicitud fija el refugio desde la sesión y registra auditoría sin datos clínicos", async () => {
  const context = fixture(shelter);
  await executeCollaboration(context.transaction, shelter, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Necesitamos revisiones preventivas" });
  assert.equal(context.writes[0].args.create.shelterId, shelter.id);
  assert.equal(context.writes[0].args.create.status, undefined);
  assert.deepEqual(context.writes[1].args.data.after, { status: "PENDING" });
  assert.equal(context.writes[1].args.data.actorId, shelter.id);
});

test("no se solicita a profesionales ocultos ni se duplican pendientes o activas", async () => {
  for (const status of ["PENDING", "ACCEPTED"]) {
    const context = fixture(shelter, status);
    await assert.rejects(executeCollaboration(context.transaction, shelter, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Revisiones del refugio" }));
    assert.equal(context.writes.length, 0);
  }
  for (const actor of [shelter, veterinarian]) {
    const context = fixture(actor, null, false);
    await assert.rejects(executeCollaboration(context.transaction, actor, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Revisiones del refugio" }));
    assert.equal(context.writes.length, 0);
  }
});

test("solo el veterinario destinatario puede aceptar o rechazar una pendiente", async () => {
  for (const accept of [true, false]) {
    const context = fixture(veterinarian, "PENDING");
    await executeCollaboration(context.transaction, veterinarian, { type: "collaboration.respond", id: "collaboration", accept });
    assert.equal(context.writes[0].args.data.status, accept ? "ACCEPTED" : "REJECTED");
  }
  for (const actor of [shelter, administrator, { ...veterinarian, id: "otro-vet" }]) {
    const context = fixture(actor, "PENDING");
    await assert.rejects(executeCollaboration(context.transaction, actor, { type: "collaboration.respond", id: "collaboration", accept: true }));
    assert.equal(context.writes.length, 0);
  }
});

test("respuestas antiguas o repetidas no reactivan una colaboración", async () => {
  for (const status of ["ACCEPTED", "REJECTED", "CANCELLED", "ENDED"]) {
    const context = fixture(veterinarian, status);
    await assert.rejects(executeCollaboration(context.transaction, veterinarian, { type: "collaboration.respond", id: "collaboration", accept: true }));
    assert.equal(context.writes.length, 0);
  }
});

test("ambas partes pueden finalizar y terceros no pueden hacerlo", async () => {
  for (const actor of [shelter, veterinarian, administrator]) {
    const context = fixture(actor, "ACCEPTED");
    await executeCollaboration(context.transaction, actor, { type: "collaboration.end", id: "collaboration" });
    assert.equal(context.writes[0].args.data.status, "ENDED");
  }
  const third = { ...shelter, id: "otro-refugio" };
  const context = fixture(third, "ACCEPTED");
  await assert.rejects(executeCollaboration(context.transaction, third, { type: "collaboration.end", id: "collaboration" }));
  assert.equal(context.writes.length, 0);
});

test("reenviar solicitudes cerradas vuelve a requerir aceptación", async () => {
  for (const status of ["REJECTED", "CANCELLED", "ENDED"]) {
    const context = fixture(shelter, status);
    await executeCollaboration(context.transaction, shelter, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Nueva propuesta de atención" });
    assert.equal(context.writes[0].args.update.status, "PENDING");
  }
});
