import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getPasswordValidationError } from "../src/lib/password-policy.ts";

export const recoveryEmail = "patamatchadmin@gmail.com";

export class RecoveryError extends Error {}

export function validateRecoveryInput(connection, email, password) {
  let url;
  try { url = new URL(connection); } catch { throw new RecoveryError("La conexión de Neon no es una URL válida. No se cambió nada."); }
  if (!["postgresql:", "postgres:"].includes(url.protocol)
    || !url.hostname.endsWith(".neon.tech")
    || !url.username || !url.password || url.pathname.length < 2
    || !["require", "verify-full"].includes(url.searchParams.get("sslmode"))) {
    throw new RecoveryError("Usa la conexión PostgreSQL de Neon con usuario, contraseña, base y sslmode=require. No se cambió nada.");
  }
  if (email !== recoveryEmail) throw new RecoveryError("El correo no coincide con la cuenta administradora autorizada. No se cambió nada.");
  const passwordError = getPasswordValidationError(password);
  if (password.length < 16) throw new RecoveryError("La nueva contraseña debe tener al menos 16 caracteres. No se cambió nada.");
  if (passwordError) throw new RecoveryError(passwordError);
}

export async function resetAdminPassword(client, email, password) {
  if (email !== recoveryEmail) throw new RecoveryError("Cuenta de recuperación no autorizada.");
  const passwordError = getPasswordValidationError(password);
  if (password.length < 16 || passwordError) throw new RecoveryError(passwordError || "Usa al menos 16 caracteres.");
  const passwordHash = await hashPassword(password);
  if (!await verifyPassword({ hash: passwordHash, password })) throw new RecoveryError("No se pudo verificar la nueva contraseña. No se cambió nada.");
  await client.$transaction(async transaction => {
    const user = await transaction.user.findUnique({
      where: { email },
      select: { id: true, role: true, active: true },
    });
    if (!user || user.role !== "ADMIN" || !user.active) {
      throw new RecoveryError("No se encontró esa cuenta como ADMIN activa en esta base. No se cambió nada.");
    }
    const accounts = await transaction.account.findMany({
      where: { userId: user.id, providerId: "credential" },
      select: { id: true },
    });
    if (accounts.length !== 1) throw new RecoveryError("La cuenta no tiene un único acceso de correo y contraseña. No se cambió nada.");
    await transaction.account.update({ where: { id: accounts[0].id }, data: { password: passwordHash } });
    await transaction.session.deleteMany({ where: { userId: user.id } });
  });
}

async function main() {
  let client;
  try {
    const input = readFileSync(0, "utf8").split("\0");
    if (input.length !== 4 || input[3] !== "") throw new RecoveryError("Ejecuta el comando mediante npm run admin:reset-password.");
    const [connection, email, password] = input;
    validateRecoveryInput(connection, email, password);
    client = new PrismaClient({ datasources: { db: { url: connection } }, log: [] });
    await resetAdminPassword(client, email, password);
    console.log("Contraseña restablecida. Se cerraron las sesiones anteriores de esta cuenta. Inicia sesión en Vercel con tu nueva contraseña.");
  } catch (error) {
    console.error(error instanceof RecoveryError ? error.message : "No se pudo completar la recuperación. Verifica la conexión de Neon y vuelve a intentarlo. No compartas la conexión ni los registros privados.");
    process.exitCode = 1;
  } finally {
    await client?.$disconnect().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
