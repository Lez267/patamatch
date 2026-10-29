import test from "node:test";
import assert from "node:assert/strict";
import { verifyPassword } from "better-auth/crypto";
import { recoveryEmail, resetAdminPassword, validateRecoveryInput } from "../scripts/reset-admin-password.mjs";

const connection = "postgresql://owner:fake@ep-example.neon.tech/patamatch?sslmode=require";
const password = "Bosque!7Luna#9Hoja";

test("recuperación exige Neon con TLS, cuenta autorizada y contraseña segura", () => {
  assert.doesNotThrow(() => validateRecoveryInput(connection, recoveryEmail, password));
  for (const invalid of ["", "postgresql://owner:fake@localhost/patamatch?sslmode=require", connection.replace(".neon.tech", ".neon.tech.example.com"), connection.replace("require", "disable")]) {
    assert.throws(() => validateRecoveryInput(invalid, recoveryEmail, password));
  }
  assert.throws(() => validateRecoveryInput(connection, "otra@example.test", password));
  assert.throws(() => validateRecoveryInput(connection, recoveryEmail, "UnaClave!7"));
});

function fakeClient(user: { id: string; role: string; active: boolean } | null, accounts = [{ id: "credential-admin" }]) {
  const writes: Array<{ operation: string; args: any }> = [];
  const transaction = {
    user: { findUnique: async () => user },
    account: {
      findMany: async () => accounts,
      update: async (args: any) => { writes.push({ operation: "password", args }); },
    },
    session: { deleteMany: async (args: any) => { writes.push({ operation: "sessions", args }); } },
  };
  return { writes, $transaction: async (callback: (transaction: any) => Promise<void>) => callback(transaction) };
}

test("recuperación cambia solo el hash y revoca sesiones del administrador", async () => {
  const client = fakeClient({ id: "admin-id", role: "ADMIN", active: true });
  await resetAdminPassword(client, recoveryEmail, password);
  assert.equal(client.writes.length, 2);
  assert.deepEqual(client.writes[0].args.where, { id: "credential-admin" });
  assert.deepEqual(Object.keys(client.writes[0].args.data), ["password"]);
  assert.notEqual(client.writes[0].args.data.password, password);
  assert.equal(await verifyPassword({ hash: client.writes[0].args.data.password, password }), true);
  assert.deepEqual(client.writes[1], { operation: "sessions", args: { where: { userId: "admin-id" } } });
});

test("recuperación no escribe ante usuario ausente, inactivo o no administrador", async () => {
  for (const user of [null, { id: "user", role: "ADOPTANTE", active: true }, { id: "admin", role: "ADMIN", active: false }]) {
    const client = fakeClient(user);
    await assert.rejects(resetAdminPassword(client, recoveryEmail, password));
    assert.equal(client.writes.length, 0);
  }
});

test("recuperación no crea cuentas ni cambia usuarios con accesos ambiguos", async () => {
  for (const accounts of [[], [{ id: "first" }, { id: "second" }]]) {
    const client = fakeClient({ id: "admin", role: "ADMIN", active: true }, accounts);
    await assert.rejects(resetAdminPassword(client, recoveryEmail, password));
    assert.equal(client.writes.length, 0);
  }
});
