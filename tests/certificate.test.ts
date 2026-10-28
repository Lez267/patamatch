import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdoptionCertificateContent } from "../src/components/adoption-certificate";
import type { AdoptionApplication, Pet } from "../src/lib/types";

const application: AdoptionApplication = {
  id: "test-application", folio: "PM-TEST", petId: "test-pet", adopterId: "test-adopter",
  adopterName: "Familia de prueba", adopterEmail: "familia@example.test", phone: "2280000000",
  motivation: "Ofrecer un hogar adecuado y acompañamiento responsable.", status: "adoptada",
  createdAt: "2026-10-20T12:00:00Z", profileSnapshot: null, matchingSnapshot: null,
  events: [{ status: "adoptada", note: "Entrega de prueba", at: "2026-10-26T12:00:00Z" }],
};
const pet: Pet = {
  id: "test-pet", name: "Compañero de prueba", species: "otro", breed: "Otra especie",
  age: "joven", ageYears: 1, sex: "hembra", size: "pequeno", energy: "media",
  personality: ["Tranquila"], children: "supervision", otherPets: "depende", care: "medio",
  health: "Cuidados pendientes de confirmación", vaccinated: false, neutered: false, regulated: false,
  description: "Mascota ficticia de regresión", city: "Ciudad de prueba", image: "/pets/test.jpg",
  shelterId: "test-shelter", shelterName: "Refugio de prueba", status: "adoptado", createdAt: "2026-10-20T12:00:00Z",
};

test("el comprobante conserva otra especie y no inventa cuidados completos", () => {
  const html = renderToStaticMarkup(createElement(AdoptionCertificateContent, { application, pet }));
  assert.match(html, /Otra especie/);
  assert.match(html, /Vacunas por confirmar/);
  assert.match(html, /Esterilización pendiente/);
  assert.doesNotMatch(html, /Vacunas al día|Esterilizado\/a|Registro inmutable|oficial PataMatch/);
});

test("el comprobante confirma los cuidados únicamente cuando están registrados", () => {
  const html = renderToStaticMarkup(createElement(AdoptionCertificateContent, { application, pet: { ...pet, species: "gato", vaccinated: true, neutered: true } }));
  assert.match(html, /Gato/);
  assert.match(html, /Vacunas al día/);
  assert.match(html, /Esterilizado\/a/);
  assert.doesNotMatch(html, /Vacunas por confirmar|Esterilización pendiente/);
});

test("una ficha ausente no se sustituye por datos de otra mascota o refugio", () => {
  const html = renderToStaticMarkup(createElement(AdoptionCertificateContent, { application }));
  assert.match(html, /Información no disponible/);
  assert.match(html, /No hay información de salud disponible/);
  assert.doesNotMatch(html, /Huellitas A\.C\.|Orizaba|coco\.jpg|Vacunas al día|Esterilizado\/a/);
});

test("la fecha del comprobante no se toma de un evento distinto a la adopción", () => {
  const html = renderToStaticMarkup(createElement(AdoptionCertificateContent, { application: { ...application, events: [{ status: "aprobada", at: "2026-10-25T12:00:00Z", note: "Aprobación" }] }, pet }));
  assert.match(html, /No registrada/);
});
