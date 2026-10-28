import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionApplication, isActiveApplication } from "../src/lib/matching";
import type { ApplicationStatus, Role } from "../src/lib/types";

test("el refugio revisa cada etapa y solo completa solicitudes aprobadas", () => {
  assert.equal(canTransitionApplication("enviada", "en_revision", "REFUGIO"), true);
  assert.equal(canTransitionApplication("en_revision", "entrevista", "REFUGIO"), true);
  assert.equal(canTransitionApplication("entrevista", "visita", "REFUGIO"), true);
  assert.equal(canTransitionApplication("visita", "aprobada", "REFUGIO"), true);
  assert.equal(canTransitionApplication("aprobada", "adoptada", "REFUGIO"), true);
  assert.equal(canTransitionApplication("enviada", "adoptada", "REFUGIO"), false);
  assert.equal(canTransitionApplication("enviada", "aprobada", "REFUGIO"), false);
});

test("un adoptante puede cancelar pero no aprobar ni revisar solicitudes", () => {
  assert.equal(canTransitionApplication("enviada", "cancelada", "ADOPTANTE"), true);
  assert.equal(canTransitionApplication("aprobada", "cancelada", "ADOPTANTE"), true);
  assert.equal(canTransitionApplication("enviada", "en_revision", "ADOPTANTE"), false);
  assert.equal(canTransitionApplication("visita", "aprobada", "ADOPTANTE"), false);
  assert.equal(canTransitionApplication("aprobada", "adoptada", "ADOPTANTE"), false);
});

test("los estados terminales no se reabren por ningún rol", () => {
  const terminalStatuses: ApplicationStatus[] = ["rechazada", "adoptada", "cancelada"];
  const roles: Role[] = ["ADOPTANTE", "REFUGIO", "VETERINARIO", "ADMIN"];
  const nextStatuses: ApplicationStatus[] = ["enviada", "en_revision", "entrevista", "visita", "aprobada", "rechazada", "adoptada", "cancelada"];
  for (const status of terminalStatuses) for (const role of roles) for (const next of nextStatuses) assert.equal(canTransitionApplication(status, next, role), false);
});

test("veterinarios no cambian solicitudes y refugios no actúan como adoptantes", () => {
  assert.equal(canTransitionApplication("en_revision", "visita", "VETERINARIO"), false);
  assert.equal(canTransitionApplication("en_revision", "cancelada", "REFUGIO"), false);
  assert.equal(canTransitionApplication("en_revision", "rechazada", "REFUGIO"), true);
  assert.equal(canTransitionApplication("en_revision", "cancelada", "ADMIN"), true);
});

test("el control de duplicados identifica todas las solicitudes activas", () => {
  for (const status of ["enviada", "en_revision", "entrevista", "visita", "aprobada"]) assert.equal(isActiveApplication(status), true);
  for (const status of ["cancelada", "rechazada", "adoptada"]) assert.equal(isActiveApplication(status), false);
});
