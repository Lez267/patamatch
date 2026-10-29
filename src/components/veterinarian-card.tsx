import type { ReactNode } from "react";
import { Mail, MapPin, Phone, Stethoscope } from "lucide-react";
import type { VeterinaryDirectoryEntry } from "@/lib/types";
import { clinicPhoneHref } from "@/lib/veterinary-contact";

export function VeterinarianCard({ veterinarian, children }: { veterinarian: VeterinaryDirectoryEntry; children?: ReactNode }) {
  const initials = veterinarian.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("es");
  const phoneHref = clinicPhoneHref(veterinarian.phone);
  return <article className="veterinarian-card">
    <div className="veterinarian-card-top"><span className="veterinarian-initials" aria-hidden="true">{initials}</span><span className="badge green">Disponible</span></div>
    <div><h3>{veterinarian.name}</h3><p className="veterinarian-specialty"><Stethoscope size={17} aria-hidden="true" />{veterinarian.specialty}</p></div>
    <dl className="veterinarian-contact">
      <div><dt>Veterinaria / consultorio</dt><dd>{veterinarian.clinicName || "No especificado"}</dd></div>
      <div><dt><MapPin size={16} aria-hidden="true" />Ciudad de atención</dt><dd>{veterinarian.city}</dd></div>
      <div><dt><Mail size={16} aria-hidden="true" />Correo profesional</dt><dd><a href={`mailto:${veterinarian.email}`}>{veterinarian.email}</a></dd></div>
      <div><dt><Phone size={16} aria-hidden="true" />Teléfono de la veterinaria</dt><dd>{phoneHref ? <a href={phoneHref}>{veterinarian.phone}</a> : "No publicado"}</dd></div>
    </dl>
    {veterinarian.bio && <p className="muted">{veterinarian.bio}</p>}
    <div className="veterinarian-card-actions">{children}</div>
  </article>;
}
