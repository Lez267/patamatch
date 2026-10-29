import type { Prisma } from "@prisma/client";
import { auditEvent } from "./collaborations";
import { RequestError } from "./request-error";
import type { Command, User } from "./types";

export async function executeAccountAdministration(transaction: Prisma.TransactionClient, viewer: User, action: Extract<Command, { type: "user.role" | "user.toggle" }>) {
  const actor = await transaction.user.findUnique({ where: { id: viewer.id } });
  if (!actor?.active || actor.role !== "ADMIN") throw new RequestError("Tu cuenta ya no tiene permisos administrativos.", 403);
  if (action.id === actor.id) throw new RequestError("No puedes cambiar tu propio rol ni suspender tu cuenta.");
  const target = await transaction.user.findUnique({ where: { id: action.id } });
  if (!target) throw new RequestError("Cuenta no encontrada.", 404);
  if (action.type === "user.role") {
    if (target.role === action.role) return;
    if (target.role === "REFUGIO" && await transaction.pet.count({ where: { shelterId: target.id } }) > 0) throw new RequestError("Este refugio tiene mascotas registradas. Conserva su rol hasta transferir su responsabilidad.", 409);
    if (target.role === "ADOPTANTE" && await transaction.adoptionApplication.count({ where: { adopterId: target.id, status: { in: ["enviada", "en_revision", "entrevista", "visita", "aprobada"] } } }) > 0) throw new RequestError("Esta cuenta tiene solicitudes de adopción activas. Deben concluir antes de cambiar su rol.", 409);
    await transaction.user.update({ where: { id: target.id }, data: { role: action.role } });
    await auditEvent(transaction, actor, action.type, target.id, target.name, { role: target.role }, { role: action.role });
  } else {
    await transaction.user.update({ where: { id: target.id }, data: { active: !target.active } });
    await auditEvent(transaction, actor, action.type, target.id, target.name, { active: target.active }, { active: !target.active });
  }
  if (action.type === "user.role" || target.active) {
    await transaction.session.deleteMany({ where: { userId: target.id } });
    await transaction.collaboration.updateMany({ where: { OR: [{ shelterId: target.id }, { veterinarianId: target.id }], status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "ENDED" } });
    await transaction.veterinaryProfile.updateMany({ where: { userId: target.id }, data: { available: false } });
  }
}
