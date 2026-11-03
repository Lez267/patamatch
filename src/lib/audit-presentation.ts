import type { AuditEvent } from "./types";

export const auditRoleLabels: Record<string, string> = { ADMIN: "Administrador", VETERINARIO: "Veterinario", REFUGIO: "Refugio", ADOPTANTE: "Adoptante" };
const statusLabels: Record<string, string> = { PENDING: "Pendiente de respuesta", ACCEPTED: "Colaboración activa", REJECTED: "Solicitud rechazada", CANCELLED: "Solicitud cancelada", ENDED: "Colaboración finalizada" };

export function auditPresentation(event: AuditEvent) {
  if (event.action === "user.role") return { title: "Cambio de rol", category: "roles", targetLabel: "Cuenta afectada", explanation: "Se actualizaron los permisos de esta cuenta." };
  if (event.action === "user.toggle") return { title: event.after.active === true ? "Cuenta reactivada" : "Cuenta suspendida", category: "access", targetLabel: "Cuenta afectada", explanation: event.after.active === true ? "La cuenta puede volver a iniciar sesión." : "Se desactivó el acceso de esta cuenta." };
  if (event.action === "collaboration.request") return { title: "Solicitud de colaboración", category: "collaborations", targetLabel: "Colaboración", explanation: "El refugio solicitó apoyo a un veterinario." };
  if (event.action === "collaboration.respond") return { title: event.after.status === "ACCEPTED" ? "Colaboración aceptada" : "Solicitud rechazada", category: "collaborations", targetLabel: "Colaboración", explanation: "El veterinario respondió a la solicitud del refugio." };
  if (event.action === "collaboration.end") return { title: event.after.status === "CANCELLED" ? "Solicitud cancelada" : "Colaboración finalizada", category: "collaborations", targetLabel: "Colaboración", explanation: "La solicitud o el acceso compartido se cerró. Los historiales se conservan." };
  return { title: "Actividad registrada", category: "other", targetLabel: "Registro afectado", explanation: "Consulta los valores anteriores y posteriores para revisar este cambio." };
}

export function auditChanges(values: Record<string, unknown>) {
  const fields: Record<string, string> = { role: "Rol de la cuenta", active: "Acceso a la cuenta", status: "Estado de colaboración" };
  return Object.entries(values).map(([key, value]) => ({
    key, label: fields[key] ?? key,
    value: value === null ? "Sin registro previo" : key === "active" && typeof value === "boolean" ? value ? "Activo" : "Suspendido" : typeof value === "boolean" ? value ? "Sí" : "No" : auditRoleLabels[String(value)] ?? statusLabels[String(value)] ?? String(value),
  }));
}

export function auditDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { day: "Fecha no disponible", time: "" };
  return { day: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(date), time: new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" }).format(date) };
}
