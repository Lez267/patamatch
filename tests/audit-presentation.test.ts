import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuditEntry } from "../src/components/audit-entry";
import { auditChanges, auditDate, auditPresentation } from "../src/lib/audit-presentation";
import type { AuditEvent } from "../src/lib/types";

const event: AuditEvent = { id: "event-test", actorId: "admin-test", actorName: "Administración de prueba", actorRole: "ADMIN", action: "user.role", targetId: "user-test", targetName: "Cuenta de prueba", before: { role: "ADOPTANTE" }, after: { role: "VETERINARIO" }, createdAt: "2026-10-29T16:02:00.000Z" };

test("bitácora distingue cambios de rol, suspensión y reactivación", () => {
  assert.equal(auditPresentation(event).category, "roles");
  assert.equal(auditPresentation({ ...event, action: "user.toggle", after: { active: false } }).title, "Cuenta suspendida");
  assert.equal(auditPresentation({ ...event, action: "user.toggle", after: { active: true } }).title, "Cuenta reactivada");
});

test("bitácora nombra cada resultado de una colaboración", () => {
  for (const [action, status, title] of [["collaboration.respond", "ACCEPTED", "Colaboración aceptada"], ["collaboration.respond", "REJECTED", "Solicitud rechazada"], ["collaboration.end", "CANCELLED", "Solicitud cancelada"], ["collaboration.end", "ENDED", "Colaboración finalizada"]]) {
    assert.equal(auditPresentation({ ...event, action, after: { status } }).title, title);
  }
  assert.equal(auditPresentation({ ...event, action: "future.action" }).category, "other");
});

test("comparación traduce permisos y acceso sin presentar JSON crudo", () => {
  assert.deepEqual(auditChanges({ role: "VETERINARIO", active: false }), [{ key: "role", label: "Rol de la cuenta", value: "Veterinario" }, { key: "active", label: "Acceso a la cuenta", value: "Suspendido" }]);
  assert.equal(auditChanges({ status: null })[0].value, "Sin registro previo");
  assert.deepEqual(auditChanges({}), []);
});

test("fecha de bitácora tiene zona horaria explícita y tolera fecha inválida", () => {
  assert.match(auditDate(event.createdAt).time, /10:02/);
  assert.match(auditDate(event.createdAt).day, /29.*2026/);
  assert.equal(auditDate("inválida").day, "Fecha no disponible");
});

test("evento separa personas y estados, con IDs en un desplegable cerrado", () => {
  const markup = renderToStaticMarkup(createElement(AuditEntry, { event }));
  for (const label of ["Realizado por", "Cuenta afectada", "Antes del cambio", "Después del cambio", "Adoptante", "Veterinario", "Ver identificadores técnicos"]) assert.ok(markup.includes(label), label);
  assert.ok(markup.indexOf("admin-test") > markup.indexOf("<details"));
  assert.equal(/<details[^>]*\bopen\b/.test(markup), false);
  assert.equal(markup.includes("→ Cuenta de prueba"), false);
});

test("nombres se escapan y estados vacíos no rompen la tarjeta", () => {
  const markup = renderToStaticMarkup(createElement(AuditEntry, { event: { ...event, actorName: '<img src=x onerror="alert(1)">', before: {}, after: {} } }));
  assert.equal(markup.includes("<img src=x"), false);
  assert.ok(markup.includes("Sin datos anteriores."));
  assert.ok(markup.includes("Sin datos posteriores."));
});
