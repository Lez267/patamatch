import type { MatchResult } from "./matching";

export type Role = "ADOPTANTE" | "REFUGIO" | "VETERINARIO" | "ADMIN";
export type Level = "bajo" | "medio" | "alto";
export type Energy = "baja" | "media" | "alta";
export type Size = "pequeno" | "mediano" | "grande";
export type Age = "cachorro" | "joven" | "adulto" | "senior";
export type Species = "perro" | "gato" | "otro";
export type ApplicationStatus = "enviada" | "en_revision" | "entrevista" | "visita" | "aprobada" | "rechazada" | "adoptada" | "cancelada";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface LifestyleProfile {
  housing: "casa" | "departamento";
  yard: boolean;
  space: Size;
  rental: boolean;
  permission: boolean;
  children: boolean;
  youngChildren: boolean;
  otherPets: Species[];
  experience: "ninguna" | "basica" | "intermedia" | "avanzada";
  hoursAway: number;
  backupCare: boolean;
  allergies: boolean;
  activity: Energy;
  species: Species | "cualquiera";
  size: Size | "cualquiera";
  age: Age | "cualquiera";
  budget: Level;
  city: string;
  completed: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  age: Age;
  ageYears: number;
  sex: "hembra" | "macho";
  size: Size;
  energy: Energy;
  personality: string[];
  children: "apto" | "supervision" | "no";
  otherPets: "apto" | "depende" | "no";
  care: Level;
  health: string;
  vaccinated: boolean;
  neutered: boolean;
  regulated: boolean;
  description: string;
  city: string;
  image: string;
  shelterId: string;
  shelterName: string;
  status: "disponible" | "en_proceso" | "adoptado" | "pausado";
  createdAt: string;
}

export interface AdoptionApplication {
  id: string;
  folio: string;
  petId: string;
  adopterId: string;
  adopterName: string;
  adopterEmail: string;
  status: ApplicationStatus;
  motivation: string;
  phone: string;
  profileSnapshot: LifestyleProfile | null;
  matchingSnapshot: MatchResult | null;
  createdAt: string;
  events: { status: ApplicationStatus; note: string; at: string }[];
}

export interface MedicalRecord {
  id: string;
  petId: string;
  veterinarianId: string;
  veterinarianName: string;
  kind: "revision" | "vacuna" | "tratamiento";
  notes: string;
  date: string;
  nextDate: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  petId: string;
  reason: string;
  status: "pendiente" | "resuelto";
}

export interface AppState {
  user: User | null;
  pets: Pet[];
  profile: LifestyleProfile | null;
  favorites: string[];
  applications: AdoptionApplication[];
  medicalRecords: MedicalRecord[];
  users: User[];
  reports: Report[];
  veterinaryProfile: VeterinaryProfile | null;
  veterinarians: VeterinaryDirectoryEntry[];
  collaborations: Collaboration[];
  auditEvents: AuditEvent[];
}

export interface VeterinaryProfile {
  clinicName: string;
  phone: string;
  city: string;
  specialty: string;
  bio: string;
  available: boolean;
}

export interface VeterinaryDirectoryEntry extends VeterinaryProfile {
  id: string;
  name: string;
  email: string;
}

export interface Collaboration {
  id: string;
  shelterId: string;
  shelterName: string;
  shelterEmail: string;
  veterinarianId: string;
  veterinarianName: string;
  veterinarianEmail: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "ENDED";
  message: string;
  createdAt: string;
  updatedAt: string;
  participantsActive: boolean;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetName: string;
  targetId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
}

export type PetInput = Omit<Pet, "id" | "shelterId" | "shelterName" | "createdAt">;
export type Command =
  | import("./collaborations").CollaborationCommand
  | { type: "profile.save"; profile: LifestyleProfile }
  | { type: "favorite.toggle"; petId: string }
  | { type: "application.create"; petId: string; motivation: string; phone: string; commitment: boolean }
  | { type: "application.status"; id: string; status: ApplicationStatus; note: string }
  | { type: "pet.create"; pet: PetInput }
  | { type: "pet.update"; id: string; changes: Partial<PetInput> }
  | { type: "medical.create"; record: Omit<MedicalRecord, "id" | "veterinarianId" | "veterinarianName" | "createdAt"> }
  | { type: "user.toggle"; id: string }
  | { type: "user.role"; id: string; role: Role }
  | { type: "report.resolve"; id: string }
  | { type: "demo.reset" };

export const statusLabels: Record<ApplicationStatus, string> = {
  enviada: "Solicitud enviada", en_revision: "En revisión", entrevista: "Entrevista",
  visita: "Visita", aprobada: "Aprobada", rechazada: "Rechazada", adoptada: "Adopción completada", cancelada: "Cancelada",
};

export const defaultProfile: LifestyleProfile = {
  housing: "casa", yard: true, space: "mediano", rental: false, permission: true,
  children: false, youngChildren: false, otherPets: [], experience: "basica",
  hoursAway: 4, backupCare: true, allergies: false, activity: "alta",
  species: "perro", size: "cualquiera", age: "cualquiera", budget: "medio", city: "Xalapa", completed: false,
};
