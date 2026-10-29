import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { clinicPhoneHref, isValidClinicPhone } from "../src/lib/veterinary-contact";
import { collaborationCommandSchema } from "../src/lib/collaborations";
import { VeterinarianCard } from "../src/components/veterinarian-card";
import { MedicalRecordMeta } from "../src/components/medical-record-meta";

test("teléfono permite formato legible y rechaza enlaces o números incompletos", () => {
  for (const value of ["", "228 555 0100", "+52 (228) 555-0100"]) assert.equal(isValidClinicPhone(value), true);
  for (const value of ["123", "javascript:alert(1)", "tel:2285550100", "2285550100 ext. 2", "1".repeat(16)]) assert.equal(isValidClinicPhone(value), false);
  assert.equal(clinicPhoneHref("+52 (228) 555-0100"), "tel:+522285550100");
  assert.equal(clinicPhoneHref(""), null);
  assert.equal(clinicPhoneHref("javascript:alert(1)"), null);
});

test("perfil valida contacto y conserva compatibilidad con perfiles sin teléfono", () => {
  const profile = { type: "veterinary.profile", city: "Xalapa", specialty: "Medicina general", bio: "", available: true };
  const parsed = collaborationCommandSchema.parse(profile);
  assert.equal(parsed.type === "veterinary.profile" && parsed.phone, "");
  assert.equal(collaborationCommandSchema.safeParse({ ...profile, clinicName: "Consultorio del Bosque", phone: "228 555 0100" }).success, true);
  assert.equal(collaborationCommandSchema.safeParse({ ...profile, phone: "llámame" }).success, false);
});

test("tarjeta muestra identidad, consultorio y contacto sin inventar datos ausentes", () => {
  const veterinarian = { id: "vet", name: "Elena Torres", email: "elena@example.test", clinicName: "Consultorio del Bosque", phone: "+52 (228) 555-0100", city: "Xalapa", specialty: "Medicina preventiva", bio: "Perros y gatos", available: true };
  const markup = renderToStaticMarkup(createElement(VeterinarianCard, { veterinarian }));
  for (const text of ["veterinarian-card", "Elena Torres", "Consultorio del Bosque", "Medicina preventiva", "tel:+522285550100", "mailto:elena@example.test"]) assert.ok(markup.includes(text), text);
  const incomplete = renderToStaticMarkup(createElement(VeterinarianCard, { veterinarian: { ...veterinarian, phone: "", clinicName: "" } }));
  assert.match(incomplete, /No publicado/);
  assert.equal(incomplete.includes('href="tel:'), false);
});

test("historial distingue responsable, fecha de atención y hora de captura del sistema", () => {
  const record = { id: "record", petId: "pet", veterinarianId: "vet", veterinarianName: "Elena Torres", kind: "revision" as const, notes: "Revisión", date: "2026-10-20", nextDate: null, createdAt: "2026-10-29T18:35:00.000Z" };
  const markup = renderToStaticMarkup(createElement(MedicalRecordMeta, { record }));
  for (const text of ["Elena Torres", 'datetime="2026-10-20"', 'datetime="2026-10-29T18:35:00.000Z"', "12:35", "Ciudad de México", "No indica la hora de la consulta"]) assert.ok(markup.toLocaleLowerCase("es").includes(text.toLocaleLowerCase("es")), text);
});
