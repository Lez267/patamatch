import test from "node:test";
import assert from "node:assert/strict";
import { calculateMatch } from "../src/lib/matching";
import { defaultProfile, type LifestyleProfile, type Pet } from "../src/lib/types";

const pet: Pet = {
  id: "canela", name: "Canela", species: "perro", breed: "Mestiza", age: "adulto", ageYears: 3,
  sex: "hembra", size: "mediano", energy: "alta", personality: ["Juguetona", "Sociable"], children: "apto",
  otherPets: "apto", care: "bajo", health: "Sana", vaccinated: true, neutered: true, regulated: false,
  description: "Compañera cariñosa", city: "Xalapa", image: "/pets/canela.jpg", shelterId: "refugio",
  shelterName: "Refugio", status: "disponible", createdAt: "2026-10-19T12:00:00.000Z",
};
const profile: LifestyleProfile = { ...defaultProfile, completed: true };

test("un perfil pendiente no inventa porcentajes ni excluye mascotas", () => {
  assert.equal(calculateMatch(pet, null).score, null);
  assert.equal(calculateMatch(pet, defaultProfile).eligible, true);
  assert.deepEqual(calculateMatch(pet, defaultProfile).factors, []);
});

test("los siete factores suman 100 y explican exactamente el resultado", () => {
  const match = calculateMatch(pet, profile);
  assert.equal(match.score, 100);
  assert.equal(match.factors.reduce((total, factor) => total + factor.weight, 0), 100);
  const partialMatch = calculateMatch({ ...pet, energy: "baja", care: "alto", size: "grande" }, { ...profile, budget: "bajo", activity: "media" });
  assert.deepEqual(partialMatch.factors.map((factor) => factor.weight), [25, 20, 15, 15, 10, 10, 5]);
  assert.deepEqual(partialMatch.factors.map((factor) => factor.key), ["temperament", "energy", "species", "size", "age", "experience", "location"]);
  assert.ok(partialMatch.factors.every((factor) => [0, 50, 100].includes(factor.score)));
  assert.equal(partialMatch.score, Math.round(partialMatch.factors.reduce((total, factor) => total + factor.weight * factor.score / 100, 0)));
});

test("el permiso de arrendamiento es obligatorio aunque la compatibilidad sea alta", () => {
  const match = calculateMatch(pet, { ...profile, rental: true, permission: false });
  assert.equal(match.eligible, false);
  assert.match(match.reasons.join(" "), /permiso/);
  assert.equal(match.score, 100);
});

test("un perro grande no se asigna a un departamento sin patio", () => {
  assert.equal(calculateMatch({ ...pet, size: "grande" }, { ...profile, housing: "departamento", yard: false }).eligible, false);
  assert.equal(calculateMatch({ ...pet, size: "grande" }, { ...profile, housing: "departamento", yard: true }).eligible, true);
});

test("niños, manejo especial, otras mascotas y alergias aplican restricciones de seguridad", () => {
  assert.equal(calculateMatch({ ...pet, children: "no" }, { ...profile, children: true }).eligible, false);
  assert.equal(calculateMatch({ ...pet, regulated: true }, { ...profile, children: true, youngChildren: true }).eligible, false);
  assert.equal(calculateMatch({ ...pet, otherPets: "no" }, { ...profile, otherPets: ["gato"] }).eligible, false);
  assert.equal(calculateMatch(pet, { ...profile, allergies: true }).eligible, false);
});

test("los cuidados altos y poca experiencia requieren revisión sin exclusión automática", () => {
  const match = calculateMatch({ ...pet, care: "alto" }, { ...profile, experience: "ninguna" });
  assert.equal(match.eligible, true);
  assert.equal(match.manualReview, true);
  assert.match(match.reasons.join(" "), /acompañamiento/);
});

test("la convivencia supervisada y ausencia prolongada se revisan con el refugio", () => {
  const match = calculateMatch({ ...pet, children: "supervision", otherPets: "depende" }, { ...profile, children: true, otherPets: ["perro"], hoursAway: 10 });
  assert.equal(match.eligible, true);
  assert.equal(match.manualReview, true);
  assert.equal(match.factors.find((factor) => factor.key === "energy")?.score, 50);
});

test("las preferencias reducen afinidad pero no sustituyen requisitos de bienestar", () => {
  const match = calculateMatch(pet, { ...profile, species: "gato", size: "grande", age: "senior" });
  assert.equal(match.eligible, true);
  assert.equal(match.score, 73);
});

test("ubicación normaliza espacios, mayúsculas y acentos sin inferir regiones", () => {
  assert.equal(calculateMatch({ ...pet, city: "Xálapa" }, { ...profile, city: "  XALAPA " }).factors.find((factor) => factor.key === "location")?.score, 100);
  assert.equal(calculateMatch({ ...pet, city: "Coatepec" }, profile).factors.find((factor) => factor.key === "location")?.score, 0);
});

test("el presupuesto no cambia el porcentaje ni genera exclusión automática", () => {
  const lowBudget = calculateMatch({ ...pet, care: "alto" }, { ...profile, budget: "bajo" });
  const highBudget = calculateMatch({ ...pet, care: "alto" }, { ...profile, budget: "alto" });
  assert.equal(lowBudget.score, highBudget.score);
  assert.equal(lowBudget.eligible, true);
  assert.match(lowBudget.reasons.join(" "), /informativo/);
});

test("el temperamento evalúa los rasgos publicados y la energía considera la disponibilidad", () => {
  const calm = calculateMatch({ ...pet, personality: ["Tranquila", "Gentil"], energy: "baja" }, { ...profile, activity: "baja", hoursAway: 4 });
  assert.equal(calm.factors.find((factor) => factor.key === "temperament")?.score, 100);
  assert.equal(calm.factors.find((factor) => factor.key === "energy")?.score, 100);
  const unavailable = calculateMatch(pet, { ...profile, hoursAway: 12, backupCare: false });
  assert.equal(unavailable.factors.find((factor) => factor.key === "energy")?.score, 0);
});
