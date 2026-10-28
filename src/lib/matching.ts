import type { ApplicationStatus, LifestyleProfile, Pet, Role } from "./types";

export interface MatchResult {
  score: number | null;
  eligible: boolean;
  reasons: string[];
  manualReview: boolean;
  factors: { key: string; label: string; weight: number; score: number }[];
}

const energyLevels = { baja: 0, media: 1, alta: 2 };
const careLevels = { bajo: 0, medio: 1, alto: 2 };
const sizeLevels = { pequeno: 0, mediano: 1, grande: 2 };
const ageLevels = { cachorro: 0, joven: 1, adulto: 2, senior: 3 };
const experienceLevels = { ninguna: 0, basica: 1, intermedia: 2, avanzada: 3 };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function differenceScore(difference: number): number {
  return difference === 0 ? 100 : difference === 1 ? 50 : 0;
}

export function calculateMatch(pet: Pet, profile: LifestyleProfile | null): MatchResult {
  if (!profile?.completed) {
    return {
      score: null,
      eligible: true,
      reasons: ["Completa tu test de estilo de vida para conocer la compatibilidad."],
      manualReview: false,
      factors: [],
    };
  }

  const reasons: string[] = [];
  let eligible = true;
  let manualReview = false;
  const block = (reason: string) => { eligible = false; reasons.push(reason); };
  const review = (reason: string) => { manualReview = true; reasons.push(reason); };

  if (profile.rental && !profile.permission) block("Necesitas permiso para tener mascotas en tu vivienda rentada.");
  if (pet.size === "grande" && profile.housing === "departamento" && !profile.yard) block("Esta mascota grande necesita una vivienda con patio.");
  if ((profile.children || profile.youngChildren) && pet.children === "no") block("Esta mascota no es apta para hogares con niños.");
  if (pet.regulated && profile.youngChildren) block("Esta mascota requiere un hogar sin niños pequeños.");
  if (profile.otherPets.length > 0 && pet.otherPets === "no") block("Esta mascota necesita ser la única mascota del hogar.");
  if (profile.allergies && (pet.species === "perro" || pet.species === "gato")) block("Las alergias declaradas requieren aclaración antes de solicitar esta mascota.");
  if (pet.care === "alto" && experienceLevels[profile.experience] < 2) review("Sus cuidados especiales requieren acompañamiento del refugio y del veterinario.");
  if (pet.regulated && experienceLevels[profile.experience] < 3) review("El refugio debe revisar tu experiencia y los requisitos de manejo responsable.");
  if ((profile.children || profile.youngChildren) && pet.children === "supervision") review("La convivencia con niños necesita supervisión y presentación gradual.");
  if (profile.otherPets.length > 0 && pet.otherPets === "depende") review("El refugio debe evaluar la convivencia con tus otras mascotas.");
  if (profile.hoursAway > 8) review("Es necesario acordar un plan de compañía y cuidados durante tus ausencias.");

  const temperament = pet.personality.map(normalize).join(" ");
  const calmTemperament = /tranquil|calm|relajad|gentil/.test(temperament);
  const activeTemperament = /activ|juguet|energi|alegr|aventur/.test(temperament);
  const temperamentLevel = calmTemperament && !activeTemperament ? 0 : activeTemperament && !calmTemperament ? 2 : 1;
  const temperamentScore = differenceScore(Math.abs(temperamentLevel - energyLevels[profile.activity]));
  const activityDifference = Math.abs(energyLevels[profile.activity] - energyLevels[pet.energy]);
  const activityScore = differenceScore(activityDifference);
  const idealHours = pet.age === "cachorro" || pet.care === "alto" || pet.energy === "alta" ? 4 : pet.energy === "media" ? 6 : 8;
  const timeScore = profile.hoursAway <= idealHours ? 100 : profile.hoursAway <= 8 || profile.backupCare ? 50 : 0;
  const energyScore = Math.min(activityScore, timeScore);
  const speciesScore = profile.species === "cualquiera" || profile.species === pet.species ? 100 : 0;
  const sizeScore = profile.size === "cualquiera" ? 100 : differenceScore(Math.abs(sizeLevels[profile.size] - sizeLevels[pet.size]));
  const ageScore = profile.age === "cualquiera" ? 100 : differenceScore(Math.abs(ageLevels[profile.age] - ageLevels[pet.age]));
  const neededExperience = pet.regulated ? 3 : pet.care === "alto" ? 2 : pet.energy === "alta" ? 1 : 0;
  const experienceDifference = experienceLevels[profile.experience] - neededExperience;
  const experienceScore = experienceDifference >= 0 ? 100 : experienceDifference === -1 ? 50 : 0;
  const locationScore = normalize(profile.city) === normalize(pet.city) ? 100 : 0;
  const factors = [
    { key: "temperament", label: "Temperamento", weight: 25, score: temperamentScore },
    { key: "energy", label: "Energía y disponibilidad", weight: 20, score: energyScore },
    { key: "species", label: "Especie", weight: 15, score: speciesScore },
    { key: "size", label: "Tamaño", weight: 15, score: sizeScore },
    { key: "age", label: "Edad", weight: 10, score: ageScore },
    { key: "experience", label: "Experiencia", weight: 10, score: experienceScore },
    { key: "location", label: "Ubicación", weight: 5, score: locationScore },
  ];
  if (activityScore < 100) reasons.push("Tu actividad y su energía son distintas; considera paseos y enriquecimiento diarios.");
  if (careLevels[profile.budget] < careLevels[pet.care]) reasons.push("Revisa con el refugio el presupuesto que requieren sus cuidados; este dato es informativo y no modifica tu compatibilidad.");
  if (timeScore === 0) reasons.push("La mascota necesitará más compañía o una persona de apoyo.");
  if (locationScore === 0) reasons.push("La mascota está en otra ciudad; acuerda con el refugio las visitas y el traslado responsable.");
  if (reasons.length === 0) reasons.push("Tu estilo de vida es compatible con las necesidades publicadas de esta mascota.");

  return { score: Math.round(factors.reduce((total, factor) => total + factor.weight * factor.score / 100, 0)), eligible, reasons, manualReview, factors };
}

const activeStatuses: ApplicationStatus[] = ["enviada", "en_revision", "entrevista", "visita", "aprobada"];
const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  enviada: ["en_revision", "rechazada"],
  en_revision: ["entrevista", "visita", "rechazada"],
  entrevista: ["visita", "aprobada", "rechazada"],
  visita: ["aprobada", "rechazada"],
  aprobada: ["adoptada", "rechazada"],
  rechazada: [],
  adoptada: [],
  cancelada: [],
};

export function canTransitionApplication(current: ApplicationStatus, next: ApplicationStatus, role: Role): boolean {
  if (next === "cancelada") return (role === "ADOPTANTE" || role === "ADMIN") && activeStatuses.includes(current);
  if (role !== "REFUGIO" && role !== "ADMIN") return false;
  return transitions[current]?.includes(next) ?? false;
}

export function isActiveApplication(status: string): boolean {
  return activeStatuses.includes(status as ApplicationStatus);
}
