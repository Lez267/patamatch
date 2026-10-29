import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";
import { createAuthorizedMedicalRecord, executeCollaboration, veterinaryPetFilter } from "../src/lib/collaborations";
import { executeAccountAdministration } from "../src/lib/account-administration";

test("PostgreSQL: migraciones y flujo clínico aislados, aceptación, revocación y rollback de bitácora", { skip: process.env.PATAMATCH_LOCAL_DB_TESTS !== "1" }, async () => {
  process.loadEnvFile(".env");
  const connection = new URL(process.env.DATABASE_URL!);
  assert.equal(connection.hostname, "127.0.0.1");
  assert.equal(connection.port, "55432");
  assert.equal(connection.pathname, "/patamatch");
  const schema = `test_collaborations_${crypto.randomUUID().replaceAll("-", "")}`;
  connection.searchParams.set("schema", schema);
  const database = new PrismaClient({ datasources: { db: { url: connection.toString() } } });
  try {
    await database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await transaction.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const migration of ["20261028120000_initial", "20261029120000_veterinary_collaborations", "20261029130000_veterinary_contact"]) {
        const sql = readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8");
        for (const statement of sql.split(";").map((value) => value.trim()).filter(Boolean)) await transaction.$executeRawUnsafe(statement);
      }
    });
    const shelter = await database.user.create({ data: { id: "shelter", name: "Refugio de prueba", email: "shelter@example.test", role: "REFUGIO" } });
    const otherShelter = await database.user.create({ data: { id: "other-shelter", name: "Otro refugio", email: "other@example.test", role: "REFUGIO" } });
    const veterinarian = await database.user.create({ data: { id: "vet", name: "Veterinaria de prueba", email: "vet@example.test", role: "VETERINARIO" } });
    const administrator = await database.user.create({ data: { id: "admin", name: "Administración de prueba", email: "admin@example.test", role: "ADMIN" } });
    const otherVeterinarian = await database.user.create({ data: { id: "other-vet", name: "Otro veterinario", email: "other-vet@example.test", role: "VETERINARIO" } });
    const petData = { name: "Luna", species: "gato", breed: "Doméstico", age: "joven", ageYears: 2, sex: "hembra", size: "pequeno", energy: "media", personality: ["Curiosa"], children: "supervision", otherPets: "depende", care: "bajo", health: "Sana", vaccinated: true, neutered: true, description: "Paciente para prueba aislada", city: "Xalapa", image: "/pets/luna.jpg" };
    await database.pet.create({ data: { ...petData, id: "pet", shelterId: shelter.id } });
    await database.pet.create({ data: { ...petData, id: "other-pet", shelterId: otherShelter.id } });
    const record = { petId: "pet", kind: "revision" as const, notes: "Revisión de prueba aislada", date: "2026-10-20", nextDate: null };
    const run = (operation: (transaction: Prisma.TransactionClient) => Promise<void>) => database.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await assert.rejects(run((transaction) => executeCollaboration(transaction, shelter, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Revisiones preventivas" })));
    await run((transaction) => executeCollaboration(transaction, veterinarian, { type: "veterinary.profile", clinicName: "Consultorio de prueba", phone: "+52 228 555 0100", city: "Xalapa", specialty: "Medicina general", bio: "", available: true }));
    const contact = await database.veterinaryProfile.findUniqueOrThrow({ where: { userId: veterinarian.id } });
    assert.equal(contact.clinicName, "Consultorio de prueba");
    assert.equal(contact.phone, "+52 228 555 0100");
    await run((transaction) => executeCollaboration(transaction, shelter, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Revisiones preventivas" }));
    const collaboration = await database.collaboration.findFirstOrThrow();
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(veterinarian.id) }), 0);
    await assert.rejects(run((transaction) => createAuthorizedMedicalRecord(transaction, veterinarian, record)));
    await assert.rejects(run((transaction) => executeCollaboration(transaction, otherVeterinarian, { type: "collaboration.respond", id: collaboration.id, accept: true })));
    await run((transaction) => executeCollaboration(transaction, veterinarian, { type: "collaboration.respond", id: collaboration.id, accept: true }));
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(veterinarian.id) }), 1);
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(otherVeterinarian.id) }), 0);
    await assert.rejects(run((transaction) => createAuthorizedMedicalRecord(transaction, veterinarian, { ...record, petId: "other-pet" })));
    await run((transaction) => createAuthorizedMedicalRecord(transaction, veterinarian, record));
    assert.equal(await database.medicalRecord.count(), 1);
    const savedRecord = await database.medicalRecord.findFirstOrThrow();
    assert.equal(savedRecord.veterinarianId, veterinarian.id);
    assert.equal(savedRecord.date.toISOString().slice(0, 10), record.date);
    assert.ok(Number.isFinite(savedRecord.createdAt.getTime()));
    await run((transaction) => executeCollaboration(transaction, veterinarian, { type: "veterinary.profile", city: "Xalapa", specialty: "Medicina general", bio: "", available: false }));
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(veterinarian.id) }), 1);
    await run((transaction) => executeCollaboration(transaction, shelter, { type: "collaboration.end", id: collaboration.id }));
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(veterinarian.id) }), 0);
    await assert.rejects(run((transaction) => createAuthorizedMedicalRecord(transaction, veterinarian, record)));
    assert.equal(await database.medicalRecord.count(), 1);
    assert.equal(await database.auditEvent.count(), 3);
    await run((transaction) => executeCollaboration(transaction, veterinarian, { type: "veterinary.profile", city: "Xalapa", specialty: "Medicina general", bio: "", available: true }));
    await run((transaction) => executeCollaboration(transaction, shelter, { type: "collaboration.request", veterinarianId: veterinarian.id, message: "Otra propuesta de revisión" }));
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(veterinarian.id) }), 0);
    await assert.rejects(run(async (transaction) => {
      await executeCollaboration(transaction, veterinarian, { type: "collaboration.respond", id: collaboration.id, accept: true });
      throw new Error("Rollback deliberado de prueba");
    }));
    assert.equal((await database.collaboration.findUniqueOrThrow({ where: { id: collaboration.id } })).status, "PENDING");
    assert.equal(await database.auditEvent.count(), 4);
    await database.user.update({ where: { id: shelter.id }, data: { active: false } });
    await assert.rejects(run((transaction) => executeCollaboration(transaction, veterinarian, { type: "collaboration.respond", id: collaboration.id, accept: true })));
    await database.user.update({ where: { id: shelter.id }, data: { active: true } });
    await run((transaction) => executeCollaboration(transaction, veterinarian, { type: "collaboration.respond", id: collaboration.id, accept: true }));
    await database.session.create({ data: { id: "session-vet", token: "fictitious-isolated-token", userId: veterinarian.id, expiresAt: new Date(Date.now() + 60000) } });
    await run((transaction) => executeAccountAdministration(transaction, administrator, { type: "user.toggle", id: veterinarian.id }));
    assert.equal((await database.collaboration.findUniqueOrThrow({ where: { id: collaboration.id } })).status, "ENDED");
    assert.equal(await database.session.count(), 0);
    assert.equal((await database.veterinaryProfile.findUniqueOrThrow({ where: { userId: veterinarian.id } })).available, false);
    assert.equal(await database.pet.count({ where: veterinaryPetFilter(veterinarian.id) }), 0);
    await run((transaction) => executeAccountAdministration(transaction, administrator, { type: "user.toggle", id: veterinarian.id }));
    assert.equal((await database.collaboration.findUniqueOrThrow({ where: { id: collaboration.id } })).status, "ENDED");
    await run((transaction) => executeAccountAdministration(transaction, administrator, { type: "user.role", id: veterinarian.id, role: "ADOPTANTE" }));
    const roleEvent = await database.auditEvent.findFirstOrThrow({ where: { action: "user.role" } });
    assert.deepEqual(roleEvent.before, { role: "VETERINARIO" });
    assert.deepEqual(roleEvent.after, { role: "ADOPTANTE" });
    assert.equal(roleEvent.actorId, administrator.id);
    await assert.rejects(run((transaction) => executeAccountAdministration(transaction, administrator, { type: "user.role", id: shelter.id, role: "ADOPTANTE" })));
    await assert.rejects(run((transaction) => executeAccountAdministration(transaction, veterinarian, { type: "user.toggle", id: shelter.id })));
    await assert.rejects(run((transaction) => executeAccountAdministration(transaction, administrator, { type: "user.toggle", id: administrator.id })));
  } finally {
    await database.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await database.$disconnect();
  }
});
