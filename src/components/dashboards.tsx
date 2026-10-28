"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowDownToLine, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Clock3, FileCheck, FileHeart, FileText, Heart, Home, Mail, MapPin, PawPrint, Pencil, Phone, Plus, Search, ShieldCheck, Sparkles, Stethoscope, Users, Video, X, type LucideIcon } from "lucide-react";
import { AdoptionCertificateModal } from "@/components/adoption-certificate";
import { useApp } from "@/components/app-provider";
import { PetEditor } from "@/components/pet-editor";
import { statusLabels, type AdoptionApplication, type ApplicationStatus, type MedicalRecord, type Pet, type Role } from "@/lib/types";

const petStatusLabels: Record<Pet["status"], string> = { disponible: "Disponible", en_proceso: "En proceso", adoptado: "Adoptado", pausado: "Pausado" };
const roleLabels: Record<Role, string> = { ADOPTANTE: "Adoptante", REFUGIO: "Refugio", VETERINARIO: "Veterinario", ADMIN: "Administrador" };
const medicalLabels: Record<MedicalRecord["kind"], string> = { revision: "Revisión general", vacuna: "Vacunación", tratamiento: "Tratamiento" };
const nextStatus: Partial<Record<ApplicationStatus, ApplicationStatus>> = { enviada: "en_revision", en_revision: "entrevista", entrevista: "visita", visita: "aprobada", aprobada: "adoptada" };
const sizes = { pequeno: "Pequeño", mediano: "Mediano", grande: "Grande" };

const stageIcons: Record<string, LucideIcon> = {
  enviada: Mail,
  en_revision: Search,
  entrevista: CalendarDays,
  visita: Home,
  aprobada: FileCheck,
  adoptada: Heart,
  rechazada: X,
  cancelada: X,
};

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value);
    return `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PageHead({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1 className="page-title">{title}</h1><p className="page-subtitle">{description}</p></div>{children && <div className="workspace-actions">{children}</div>}</div>;
}

function Stats({ items }: { items: { label: string; value: number | string; icon: LucideIcon; detail: string }[] }) {
  return <div className="stat-grid">{items.map(({ label, value, icon: Icon, detail }) => <div className="stat-card" key={label}><div className="row"><span className="metric-icon"><Icon size={21} /></span><span className="metric-label">{label}</span></div><strong className="metric-value">{value}</strong><span className="helper">{detail}</span></div>)}</div>;
}

function Empty({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return <div className="empty-state"><PawPrint size={34} aria-hidden="true" /><h3>{title}</h3><p className="muted">{message}</p>{children}</div>;
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`badge ${["adoptada", "aprobada"].includes(status) ? "green" : ["rechazada", "cancelada"].includes(status) ? "red" : "amber"}`}>{statusLabels[status]}</span>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="search-field"><Search size={18} aria-hidden="true" /><input type="search" className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>;
}

function ShelterHome() {
  const { state } = useApp();
  const pets = state.pets.filter((pet) => pet.shelterId === state.user?.id);
  const applications = state.applications.filter((application) => pets.some((pet) => pet.id === application.petId));
  const pending = applications.filter((application) => ["enviada", "en_revision"].includes(application.status));
  const interviews = applications.filter((application) => ["entrevista", "visita"].includes(application.status));
  return <section className="workspace-section"><PageHead eyebrow="JUNTOS HACEMOS LA DIFERENCIA" title={`Hola, ${state.user?.name ?? "refugio"} 👋`} description="Una nueva oportunidad empieza con el cuidado de cada día."><Link className="button primary" href="/refugio/registro"><Plus size={18} /> Registrar mascota</Link></PageHead><Stats items={[{ label: "En adopción", value: pets.filter((pet) => pet.status === "disponible").length, icon: PawPrint, detail: "Esperando a su persona" }, { label: "Solicitudes por revisar", value: pending.length, icon: ClipboardList, detail: "Conoce a las posibles familias" }, { label: "Entrevistas y visitas", value: interviews.length, icon: CalendarDays, detail: "Conexiones en marcha" }, { label: "Finales felices", value: pets.filter((pet) => pet.status === "adoptado").length, icon: Heart, detail: "Mascotas con un nuevo hogar" }]} /><div className="two-col"><div className="panel"><div className="panel-head"><h2>Solicitudes recientes</h2><Link className="button ghost" href="/refugio/solicitudes">Ver todas <ArrowRight size={16} /></Link></div>{applications.length ? <div className="stack">{[...applications].sort((first, second) => second.createdAt.localeCompare(first.createdAt)).slice(0, 4).map((application) => { const pet = pets.find((item) => item.id === application.petId); return <Link href="/refugio/solicitudes" className="compact-pet" key={application.id}><img className="avatar" src={pet?.image} alt="" /><div><strong>{application.adopterName}</strong><p className="muted">Quiere conocer a {pet?.name ?? "una mascota"}</p></div><StatusBadge status={application.status} /></Link>; })}</div> : <Empty title="La próxima conexión está por llegar" message="Las solicitudes de tus mascotas aparecerán aquí." />}</div><div className="panel"><div className="panel-head"><h2>Pequeños pasos, grandes cambios</h2><ShieldCheck size={24} /></div><p className="muted">Un perfil completo acerca a cada mascota a una familia compatible. Revisa sus fotografías, su historia y sus cuidados.</p><div className="divider" /><div className="stack"><Link className="compact-pet" href="/refugio/mascotas"><PawPrint size={24} /><div><strong>Actualiza sus perfiles</strong><p className="muted">{pets.length} {pets.length === 1 ? "mascota registrada" : "mascotas registradas"}</p></div><ArrowRight size={18} /></Link><Link className="compact-pet" href="/refugio/entrevistas"><CalendarDays size={24} /><div><strong>Prepara el siguiente encuentro</strong><p className="muted">{interviews.length} procesos en entrevista o visita</p></div><ArrowRight size={18} /></Link></div></div></div></section>;
}

function ShelterPets() {
  const { state, mutate, toast } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [editId, setEditId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const ownPets = state.pets.filter((pet) => pet.shelterId === state.user?.id);
  const pets = ownPets.filter((pet) => (status === "todos" || pet.status === status) && `${pet.name} ${pet.breed} ${pet.city}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const editPet = ownPets.find((pet) => pet.id === editId);
  if (editPet) return <PetEditor key={editPet.id} pet={editPet} onClose={() => setEditId(null)} />;
  async function togglePet(pet: Pet) {
    setPendingId(pet.id);
    try {
      const success = await mutate({ type: "pet.update", id: pet.id, changes: { status: pet.status === "pausado" ? "disponible" : "pausado" } });
      if (success) toast(pet.status === "pausado" ? `${pet.name} vuelve a estar disponible.` : `El perfil de ${pet.name} está pausado.`);
    } finally { setPendingId(null); }
  }
  return <section className="workspace-section"><PageHead eyebrow="CADA HUELLITA CUENTA" title="Mis mascotas" description="Sus historias merecen encontrar el hogar adecuado."><Link className="button primary" href="/refugio/registro"><Plus size={18} /> Registrar mascota</Link></PageHead><div className="panel"><div className="panel-head"><SearchBox value={query} onChange={setQuery} placeholder="Buscar por nombre, raza o ciudad" /><label className="field"><span className="field-label">Estado</span><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos los estados</option>{Object.entries(petStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><p className="helper">{pets.length} de {ownPets.length} mascotas</p></div>{pets.length ? <div className="pet-grid">{pets.map((pet) => <article className="pet-card" key={pet.id}><img className="pet-image" src={pet.image} alt={pet.name} /><div className="stack"><div className="row"><h2>{pet.name}</h2><span className={`badge ${pet.status === "disponible" ? "green" : pet.status === "adoptado" ? "green" : "amber"}`}>{petStatusLabels[pet.status]}</span></div><p className="muted">{pet.breed} · {pet.ageYears} {pet.ageYears === 1 ? "año" : "años"} · {sizes[pet.size]}</p><p className="row muted"><MapPin size={14} />{pet.city}</p><div className="chips">{pet.personality.slice(0, 3).map((trait) => <span className="badge" key={trait}>{trait}</span>)}</div><div className="form-actions"><button className="button secondary" onClick={() => setEditId(pet.id)}><Pencil size={15} /> Editar</button>{["disponible", "pausado"].includes(pet.status) ? <button className="button ghost" disabled={pendingId === pet.id} onClick={() => void togglePet(pet)}>{pendingId === pet.id ? "Guardando…" : pet.status === "pausado" ? "Reactivar" : "Pausar"}</button> : <Link href="/refugio/solicitudes" className="button ghost">Ver proceso</Link>}</div></div></article>)}</div> : <div className="panel"><Empty title={ownPets.length ? "No encontramos coincidencias" : "Su nueva historia empieza aquí"} message={ownPets.length ? "Prueba con otro nombre o cambia el filtro." : "Registra a tu primera mascota y ayúdale a encontrar una familia."}>{ownPets.length ? <button className="button secondary" onClick={() => { setQuery(""); setStatus("todos"); }}>Limpiar filtros</button> : <Link className="button primary" href="/refugio/registro"><Plus size={17} />Registrar mascota</Link>}</Empty></div>}</section>;
}

function ApplicantProfile({ application }: { application: AdoptionApplication }) {
  const profile = application.profileSnapshot;
  const match = application.matchingSnapshot;
  const speciesLabels = { perro: "Perro", gato: "Gato", otro: "Otra especie", cualquiera: "Sin preferencia" };
  const preferenceSizes = { ...sizes, cualquiera: "Sin preferencia" };
  const activityLabels = { baja: "Baja", media: "Moderada", alta: "Alta" };
  const experienceLabels = { ninguna: "Sin experiencia", basica: "Básica", intermedia: "Intermedia", avanzada: "Avanzada" };
  const ageLabels = { cachorro: "Cachorro", joven: "Joven", adulto: "Adulto", senior: "Senior", cualquiera: "Sin preferencia" };
  const budgetLabels = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
  const facts = profile ? [
    ["Vivienda", profile.housing === "casa" ? "Casa" : "Departamento"],
    ["Espacio", sizes[profile.space]], ["Patio o jardín", profile.yard ? "Sí" : "No"],
    ["Régimen", profile.rental ? "Rentada" : "Propia"],
    ["Permiso para mascotas", profile.rental ? profile.permission ? "Confirmado" : "No confirmado" : "Vivienda propia"],
    ["Niños en casa", profile.children ? profile.youngChildren ? "Incluye menores de 12 años" : "De 12 años o más" : "No"],
    ["Otras mascotas", profile.otherPets.length ? profile.otherPets.map(species => speciesLabels[species]).join(", ") : "Ninguna"],
    ["Experiencia", experienceLabels[profile.experience]], ["Horas fuera", `${profile.hoursAway} h al día`],
    ["Apoyo para cuidados", profile.backupCare ? "Sí" : "No"], ["Actividad", activityLabels[profile.activity]],
    ["Alergias declaradas", profile.allergies ? "Sí" : "No"],
    ["Especie preferida", speciesLabels[profile.species]], ["Tamaño preferido", preferenceSizes[profile.size]],
    ["Etapa preferida", ageLabels[profile.age]], ["Presupuesto", budgetLabels[profile.budget]], ["Ciudad", profile.city],
  ] : [];
  return <section className="stack applicant-profile" aria-label="Perfil y compatibilidad del solicitante">
    <h3>Perfil al enviar la solicitud</h3>
    <p className="helper">Estas respuestas se conservaron al solicitar la adopción; no cambian si la persona edita su test después.</p>
    {profile ? <dl className="snapshot-grid">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p>No hay un test guardado disponible para esta solicitud.</p>}
    {match ? <><div className="row wrap"><strong>Compatibilidad: {match.score === null ? "Sin cálculo" : `${match.score}%`}</strong><span className={`badge ${!match.eligible || match.manualReview ? "amber" : "green"}`}>{!match.eligible ? "Requisitos por revisar" : match.manualReview ? "Revisión manual requerida" : "Requisitos compatibles"}</span></div><ul className="snapshot-reasons">{match.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul><details><summary>Ver los factores guardados</summary><dl className="snapshot-grid">{match.factors.map(factor => <div key={factor.key}><dt>{factor.label} · Importancia {factor.weight}%</dt><dd>{factor.score}% de coincidencia</dd></div>)}</dl></details></> : <p className="helper">No hay un resultado de compatibilidad guardado disponible.</p>}
  </section>;
}

function ApplicationDetail({ application, pet }: { application: AdoptionApplication; pet?: Pet }) {
  const { mutate, toast } = useApp();
  const next = nextStatus[application.status];
  const [target, setTarget] = useState<ApplicationStatus>(next ?? application.status);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  // Controles específicos de cada etapa
  const [interviewDate, setInterviewDate] = useState(tomorrow());
  const [interviewTime, setInterviewTime] = useState("11:00 – 13:00 (Mediodía)");
  const [interviewMode, setInterviewMode] = useState<"presencial" | "virtual">("presencial");
  const [visitDate, setVisitDate] = useState(tomorrow());
  const [visitType, setVisitType] = useState<"domiciliaria" | "refugio">("domiciliaria");
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(false);
  const [rejectReason, setRejectReason] = useState("Espacio insuficiente para el tamaño o energía de la mascota.");

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let structuredNote = note.trim();

    if (target === "entrevista") {
      const modeText = interviewMode === "presencial" ? "Presencial en refugio" : "Videollamada virtual";
      structuredNote = `📅 Entrevista agendada: ${interviewDate} (${interviewTime}) — Modalidad ${modeText}.${structuredNote ? ` Acuerdos: ${structuredNote}` : ""}`;
    } else if (target === "visita") {
      const typeText = visitType === "domiciliaria" ? "Visita domiciliaria al hogar" : "Convivencia familiar en refugio";
      structuredNote = `🏡 Visita programada: ${visitDate} — ${typeText}.${structuredNote ? ` Acuerdos: ${structuredNote}` : ""}`;
    } else if (target === "aprobada") {
      if (!confirmApproval) {
        setError("Confirma la validación de requisitos antes de aprobar la adopción.");
        return;
      }
      structuredNote = `✨ Solicitud aprobada: Documentación verificada y compromiso de pre-adopción confirmado.${structuredNote ? ` Acuerdos: ${structuredNote}` : ""}`;
    } else if (target === "adoptada") {
      if (!confirmDelivery) {
        setError("Confirma la entrega física y firma de contrato para finalizar.");
        return;
      }
      structuredNote = `🎉 ¡Adopción completada con éxito! Mascota entregada con carnet médico y contrato firmado.${structuredNote ? ` Notas: ${structuredNote}` : ""}`;
    } else if (target === "rechazada") {
      structuredNote = rejectReason === "Otro motivo" ? structuredNote : `${rejectReason}${structuredNote ? ` Detalle: ${structuredNote}` : ""}`;
      if (structuredNote.length < 8) {
        setError("Explica el motivo del rechazo en al menos 8 caracteres.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const success = await mutate({ type: "application.status", id: application.id, status: target, note: structuredNote });
      if (success) {
        toast("El estado de la solicitud se actualizó.");
        setNote("");
      }
    } finally {
      setSaving(false);
    }
  }

  // Cronología invertida: actualización más reciente arriba
  const sortedEvents = [...application.events].reverse();

  return (
    <div className="application-detail">
      <div className="two-col">
        <div className="stack">
          <h3>Conoce a la familia</h3>
          <p>{application.motivation}</p>
          <div className="row wrap gap-sm">
            <a className="row" href={`mailto:${application.adopterEmail}`}>
              <Mail size={16} />{application.adopterEmail}
            </a>
            <a className="row" href={`tel:${application.phone}`}>
              <Phone size={16} />{application.phone}
            </a>
          </div>
          <p className="helper">Solicitud para {pet?.name ?? "mascota"} · Folio: {application.folio}</p>
          <ApplicantProfile application={application} />

          {next && (
            <form className="stack" onSubmit={update}>
              <label className="field">
                <span className="field-label">Avanzar al siguiente paso</span>
                <select
                  className="select"
                  value={target}
                  onChange={(event) => {
                    setTarget(event.target.value as ApplicationStatus);
                    setError("");
                  }}
                >
                  <option value={next}>{statusLabels[next]}</option>
                  <option value="rechazada">Rechazar solicitud</option>
                </select>
              </label>

              {/* Controles enriquecidos según la etapa */}
              {target === "entrevista" && (
                <div className="panel stack" style={{ background: "#e2ebd9", padding: "16px", borderRadius: "14px" }}>
                  <div className="row">
                    <CalendarDays size={18} />
                    <strong>Coordinar entrevista con la familia</strong>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">Fecha</span>
                      <input
                        type="date"
                        className="input"
                        min={today()}
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Horario propuesto</span>
                      <select className="select" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)}>
                        <option value="9:00 – 11:00 (Mañana)">Mañana (9:00 – 11:00)</option>
                        <option value="11:00 – 13:00 (Mediodía)">Mediodía (11:00 – 13:00)</option>
                        <option value="15:00 – 17:00 (Tarde)">Tarde (15:00 – 17:00)</option>
                        <option value="17:00 – 19:00 (Vespertino)">Vespertino (17:00 – 19:00)</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span className="field-label">Modalidad</span>
                    <select
                      className="select"
                      value={interviewMode}
                      onChange={(e) => setInterviewMode(e.target.value as "presencial" | "virtual")}
                    >
                      <option value="presencial">Presencial en las instalaciones del refugio</option>
                      <option value="virtual">Videollamada virtual (Google Meet / Zoom)</option>
                    </select>
                  </label>
                </div>
              )}

              {target === "visita" && (
                <div className="panel stack" style={{ background: "#e2ebd9", padding: "16px", borderRadius: "14px" }}>
                  <div className="row">
                    <Home size={18} />
                    <strong>Coordinar visita de convivencia</strong>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">Fecha de visita</span>
                      <input
                        type="date"
                        className="input"
                        min={today()}
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Tipo de encuentro</span>
                      <select
                        className="select"
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value as "domiciliaria" | "refugio")}
                      >
                        <option value="domiciliaria">Visita domiciliaria al hogar de la familia</option>
                        <option value="refugio">Convivencia presencial en el refugio</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {target === "aprobada" && (
                <div className="panel stack" style={{ background: "#d9e8d4", padding: "16px", borderRadius: "14px", border: "1px solid #c2d9ba" }}>
                  <div className="row">
                    <ShieldCheck size={20} />
                    <strong>Pre-aprobación y reserva de adopción</strong>
                  </div>
                  <p className="helper">
                    Al aprobar, <strong>{pet?.name ?? "la mascota"}</strong> pasará al estado <em>'En proceso'</em> y el número de disponibles en el dashboard bajará automáticamente.
                  </p>
                  <label className="checkbox-row" style={{ cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={confirmApproval}
                      onChange={(e) => {
                        setConfirmApproval(e.target.checked);
                        setError("");
                      }}
                    />
                    He validado la documentación y apruebo la adopción para esta familia.
                  </label>
                </div>
              )}

              {target === "adoptada" && (
                <div className="panel stack" style={{ background: "#d6ebd3", padding: "16px", borderRadius: "14px", border: "1px solid #b7ddb2" }}>
                  <div className="row">
                    <Heart size={20} />
                    <strong>¡Final Feliz! Concluir adopción definitiva</strong>
                  </div>
                  <p className="helper">
                    La mascota se registrará como adoptada, saldrá del catálogo público y se incrementará el contador de finales felices.
                  </p>
                  <label className="checkbox-row" style={{ cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={confirmDelivery}
                      onChange={(e) => {
                        setConfirmDelivery(e.target.checked);
                        setError("");
                      }}
                    />
                    Mascota entregada a la familia con carnet médico y contrato firmado.
                  </label>
                </div>
              )}

              {target === "rechazada" && (
                <div className="panel stack" style={{ background: "#f8e6e5", padding: "16px", borderRadius: "14px", border: "1px solid #f1c7c5" }}>
                  <label className="field">
                    <span className="field-label" style={{ color: "var(--red)" }}>Motivo de la resolución *</span>
                    <select className="select" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                      <option value="Espacio insuficiente para el tamaño y nivel de actividad de la mascota.">Espacio insuficiente para el animal</option>
                      <option value="Falta de autorización de mascotas en la vivienda de alquiler.">Falta de permiso en vivienda de renta</option>
                      <option value="Incompatibilidad con niños pequeños u otras mascotas del hogar.">Incompatibilidad con niños u otras mascotas</option>
                      <option value="Disponibilidad de tiempo insuficiente para el nivel de cuidados.">Disponibilidad de tiempo insuficiente</option>
                      <option value="Otro motivo">Otro motivo personalizado</option>
                    </select>
                  </label>
                </div>
              )}

              <label className="field">
                <span className="field-label">
                  {target === "rechazada" ? "Detalle o mensaje respetuoso para la familia *" : "Comentarios o acuerdos adicionales (opcional)"}
                </span>
                <textarea
                  className="textarea"
                  rows={2}
                  value={note}
                  maxLength={1000}
                  placeholder={
                    target === "rechazada"
                      ? "Explica de forma empática el motivo para que la familia comprenda la decisión…"
                      : "Detalles del punto de encuentro, recordatorios o acuerdos…"
                  }
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>

              {error && <p className="error" role="alert">{error}</p>}

              <button
                className={`button ${target === "rechazada" ? "danger" : "primary"}`}
                disabled={saving}
                type="submit"
              >
                {saving
                  ? "Guardando…"
                  : target === "adoptada"
                  ? "Concluir adopción definitiva"
                  : target === "aprobada"
                  ? "Aprobar solicitud"
                  : "Actualizar solicitud"}
                <Check size={16} />
              </button>
            </form>
          )}
        </div>

        <div>
          <h3>Historial del proceso</h3>
          <div className="timeline">
            {sortedEvents.length ? (
              sortedEvents.map((event, index) => {
                const Icon = stageIcons[event.status] ?? Check;
                const isCurrent = index === 0;
                return (
                  <div className={`timeline-item ${isCurrent ? "current" : ""}`} key={`${event.at}-${index}`}>
                    <span className={`step-dot ${isCurrent ? "active" : ""}`} style={isCurrent ? { boxShadow: "0 0 0 4px #cce1c4" } : undefined}>
                      <Icon size={14} />
                    </span>
                    <div>
                      <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                        <strong>{statusLabels[event.status]}</strong>
                        {isCurrent && <span className="badge green small">Actual</span>}
                      </div>
                      <p className="helper">{formatDate(event.at)}</p>
                      {event.note && (
                        <p style={{ marginTop: "4px", color: "var(--ink)", fontWeight: isCurrent ? 500 : 400 }}>
                          {event.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted">Solicitud recibida el {formatDate(application.createdAt)}.</p>
            )}
          </div>
          {!next && (
            <div className="inline-notice stack" style={{ gap: "10px" }}>
              <div className="row">
                <CheckCircle2 size={22} />
                <p>Este proceso está cerrado. Su historial se conserva para consulta.</p>
              </div>
              {application.status === "adoptada" && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setShowCertificate(true)}
                  style={{ alignSelf: "flex-start", marginTop: "4px" }}
                >
                  <FileText size={16} /> Ver comprobante de adopción
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showCertificate && (
        <AdoptionCertificateModal
          application={application}
          pet={pet}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}

function ShelterApplications({ interviews = false }: { interviews?: boolean }) {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ownIds = new Set(state.pets.filter((pet) => pet.shelterId === state.user?.id).map((pet) => pet.id));
  const applications = state.applications.filter((application) => ownIds.has(application.petId) && (!interviews || ["entrevista", "visita"].includes(application.status)) && (status === "todos" || status === application.status) && `${application.adopterName} ${application.folio} ${state.pets.find((pet) => pet.id === application.petId)?.name}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  return <section className="workspace-section"><PageHead eyebrow="UNA FAMILIA, UNA NUEVA HISTORIA" title={interviews ? "Entrevistas y visitas" : "Solicitudes de adopción"} description={interviews ? "Acompaña los encuentros que pueden cambiar una vida." : "Conoce a las familias y acompaña cada paso de su proceso."}><button className="button secondary" onClick={() => exportCsv(interviews ? "entrevistas-patamatch.csv" : "solicitudes-patamatch.csv", [["Folio", "Mascota", "Solicitante", "Correo", "Teléfono", "Estado", "Fecha"], ...applications.map((application) => [application.folio, state.pets.find((pet) => pet.id === application.petId)?.name ?? "", application.adopterName, application.adopterEmail, application.phone, statusLabels[application.status], formatDate(application.createdAt)])])}><ArrowDownToLine size={17} /> Exportar CSV</button></PageHead><div className="panel"><div className="panel-head"><SearchBox value={query} onChange={setQuery} placeholder="Buscar familia, mascota o folio" /><label className="field"><span className="field-label">Estado del proceso</span><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos los estados</option>{Object.entries(statusLabels).filter(([value]) => !interviews || ["entrevista", "visita"].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>{applications.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Mascota</th><th>Solicitante</th><th>Fecha</th><th>Estado</th><th>Seguimiento</th></tr></thead><tbody>{applications.map((application) => { const pet = state.pets.find((item) => item.id === application.petId); return <ApplicationRows key={application.id} application={application} pet={pet} expanded={expandedId === application.id} onExpand={() => setExpandedId(expandedId === application.id ? null : application.id)} />; })}</tbody></table></div> : <Empty title={interviews ? "Cada encuentro a su tiempo" : "Sin solicitudes por aquí"} message={query || status !== "todos" ? "No hay coincidencias con los filtros seleccionados." : interviews ? "Los procesos en entrevista o visita aparecerán aquí. Puedes avanzar una solicitud desde su detalle." : "Las familias interesadas en tus mascotas aparecerán aquí."}>{interviews && <Link className="button secondary" href="/refugio/solicitudes">Ver todas las solicitudes</Link>}</Empty>}</div></section>;
}

function ApplicationRows({ application, pet, expanded, onExpand }: { application: AdoptionApplication; pet?: Pet; expanded: boolean; onExpand: () => void }) {
  return <><tr><td><div className="row"><img className="avatar" src={pet?.image} alt="" /><div><strong>{pet?.name ?? "Mascota"}</strong><p className="helper">{application.folio}</p></div></div></td><td><strong>{application.adopterName}</strong><p className="helper">{application.adopterEmail}</p></td><td>{formatDate(application.createdAt)}</td><td><StatusBadge status={application.status} /></td><td><button className="button ghost" aria-expanded={expanded} aria-controls={`application-${application.id}`} onClick={onExpand}>{expanded ? "Cerrar" : "Ver detalle"}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td></tr>{expanded && <tr><td colSpan={5} id={`application-${application.id}`}><ApplicationDetail key={`${application.id}-${application.status}`} application={application} pet={pet} /></td></tr>}</>;
}

function UpcomingList({ limit }: { limit?: number }) {
  const { state } = useApp();
  const records = state.medicalRecords.filter((record) => record.nextDate && record.nextDate >= today()).sort((first, second) => (first.nextDate ?? "").localeCompare(second.nextDate ?? ""));
  const visible = limit ? records.slice(0, limit) : records;
  return visible.length ? <div className="record-list">{visible.map((record) => { const pet = state.pets.find((item) => item.id === record.petId); return <div className="record-item" key={record.id}><div className="calendar-date"><CalendarDays size={20} /><strong>{formatDate(record.nextDate!)}</strong></div><div><strong>{pet?.name ?? "Mascota"} · {medicalLabels[record.kind]}</strong><p className="muted">Seguimiento de {record.veterinarianName}</p><p>{record.notes}</p></div><Link className="button ghost" href={`/veterinario/expedientes?mascota=${record.petId}`}>Expediente <ArrowRight size={15} /></Link></div>; })}</div> : <Empty title="Todo al día por ahora" message="Las próximas revisiones aparecerán al registrar una fecha de seguimiento en el expediente." />;
}

function VetHome() {
  const { state } = useApp();
  const upcoming = state.medicalRecords.filter((record) => record.nextDate && record.nextDate >= today());
  return <section className="workspace-section"><PageHead eyebrow="CUIDAR TAMBIÉN ES CONECTAR" title={`Hola, ${state.user?.name ?? "doctor/a"}`} description="Bienestar y seguimiento para cada compañero de cuatro patas."><Link className="button primary" href="/veterinario/expedientes"><Plus size={17} /> Registrar atención</Link></PageHead><Stats items={[{ label: "Mascotas registradas", value: state.pets.length, icon: PawPrint, detail: "Una historia detrás de cada paciente" }, { label: "Atenciones registradas", value: state.medicalRecords.length, icon: FileHeart, detail: "Expedientes con seguimiento" }, { label: "Próximas revisiones", value: upcoming.length, icon: CalendarDays, detail: "Citas de seguimiento programadas" }, { label: "Vacunas registradas", value: state.medicalRecords.filter((record) => record.kind === "vacuna").length, icon: ShieldCheck, detail: "Prevención que protege" }]} /><div className="panel"><div className="panel-head"><h2>Próximas revisiones</h2><Link className="button ghost" href="/veterinario/agenda">Ver agenda <ArrowRight size={16} /></Link></div><UpcomingList limit={3} /></div><div className="panel"><div className="panel-head"><h2>Pacientes para conocer</h2><Link className="button ghost" href="/veterinario/expedientes">Todos los expedientes <ArrowRight size={16} /></Link></div><div className="two-col">{state.pets.slice(0, 4).map((pet) => <Link className="compact-pet" href={`/veterinario/expedientes?mascota=${pet.id}`} key={pet.id}><img className="avatar" src={pet.image} alt="" /><div><strong>{pet.name}</strong><p className="muted">{pet.breed} · {pet.shelterName}</p></div><ArrowRight size={17} /></Link>)}</div>{!state.pets.length && <Empty title="Todavía no hay pacientes" message="Las mascotas registradas por los refugios aparecerán aquí." />}</div></section>;
}

function MedicalForm({ petId }: { petId: string }) {
  const { mutate, toast } = useApp();
  const [kind, setKind] = useState<MedicalRecord["kind"]>("revision");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today());
  const [nextDate, setNextDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (notes.trim().length < 8) { setError("Describe la atención en al menos 8 caracteres."); return; }
    if (!date || date > today()) { setError("Elige una fecha de atención válida, hasta el día de hoy."); return; }
    if (nextDate && nextDate < date) { setError("La próxima revisión debe ser posterior o igual a la atención."); return; }
    setSaving(true); setError("");
    try {
      const success = await mutate({ type: "medical.create", record: { petId, kind, notes: notes.trim(), date, nextDate: nextDate || null } });
      if (success) { toast("Atención agregada al expediente."); setNotes(""); setNextDate(""); }
    } finally { setSaving(false); }
  }
  return <form className="stack" onSubmit={save}><h3>Registrar atención</h3><div className="three-col"><label className="field"><span className="field-label">Tipo de atención</span><select className="select" value={kind} onChange={(event) => setKind(event.target.value as MedicalRecord["kind"])}>{Object.entries(medicalLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field"><span className="field-label">Fecha de atención *</span><input className="input" type="date" value={date} max={today()} required onChange={(event) => setDate(event.target.value)} /></label><label className="field"><span className="field-label">Próxima revisión</span><input className="input" type="date" value={nextDate} min={date} onChange={(event) => setNextDate(event.target.value)} /></label></div><label className="field"><span className="field-label">Notas clínicas *</span><textarea className="textarea" rows={4} value={notes} maxLength={3000} required minLength={8} placeholder="Hallazgos, vacunas aplicadas, tratamiento y recomendaciones…" onChange={(event) => setNotes(event.target.value)} /></label>{error && <p className="error" role="alert">{error}</p>}<div className="form-actions"><span className="helper">El registro quedará asociado a tu cuenta.</span><button className="button primary" disabled={saving} type="submit"><Check size={17} />{saving ? "Guardando…" : "Guardar atención"}</button></div></form>;
}

function VetRecords() {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => { setSelectedId(new URLSearchParams(window.location.search).get("mascota") ?? ""); }, []);
  const filtered = state.pets.filter((pet) => `${pet.name} ${pet.breed} ${pet.shelterName}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const pet = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const records = state.medicalRecords.filter((record) => record.petId === pet?.id).sort((first, second) => second.date.localeCompare(first.date));
  return <section className="workspace-section"><PageHead eyebrow="SU BIENESTAR, EN BUENAS MANOS" title="Expedientes médicos" description="Una historia clínica completa para cuidarles mejor." /><div className="panel"><div className="panel-head"><SearchBox value={query} onChange={setQuery} placeholder="Buscar mascota, raza o refugio" /><label className="field"><span className="field-label">Paciente</span><select className="select" value={filtered.some((item) => item.id === pet?.id) ? pet?.id : ""} onChange={(event) => setSelectedId(event.target.value)}><option value="" disabled>Selecciona una mascota</option>{filtered.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.shelterName}</option>)}</select></label></div>{!filtered.length ? <Empty title="Sin pacientes con ese nombre" message="Prueba con otra búsqueda." /> : pet && <><div className="compact-pet"><img className="avatar" src={pet.image} alt={pet.name} /><div><h2>{pet.name}</h2><p className="muted">{pet.breed} · {pet.ageYears} {pet.ageYears === 1 ? "año" : "años"} · {pet.sex === "hembra" ? "Hembra" : "Macho"}</p><p className="helper">{pet.shelterName} · {pet.city}</p></div><span className="badge green">{records.length} {records.length === 1 ? "atención" : "atenciones"}</span></div><div className="inline-notice"><Stethoscope size={22} /><div><strong>Información de salud del refugio</strong><p>{pet.health}</p><p className="helper">Vacunas: {pet.vaccinated ? "al día" : "por confirmar"} · Esterilización: {pet.neutered ? "realizada" : "pendiente"}</p></div></div><div className="divider" /><MedicalForm key={pet.id} petId={pet.id} /><div className="divider" /><div className="panel-head"><h3>Historial clínico</h3><button className="button ghost" onClick={() => exportCsv(`expediente-${pet.name}.csv`, [["Mascota", "Atención", "Fecha", "Notas", "Veterinario", "Próxima revisión"], ...records.map((record) => [pet.name, medicalLabels[record.kind], record.date, record.notes, record.veterinarianName, record.nextDate ?? ""])])}><ArrowDownToLine size={16} /> Exportar CSV</button></div>{records.length ? <div className="record-list">{records.map((record) => <article className="record-item" key={record.id}><span className="metric-icon"><FileHeart size={21} /></span><div><div className="row"><strong>{medicalLabels[record.kind]}</strong><span className="helper">{formatDate(record.date)}</span></div><p>{record.notes}</p><p className="helper">{record.veterinarianName}{record.nextDate && ` · Próxima revisión: ${formatDate(record.nextDate)}`}</p></div></article>)}</div> : <Empty title="Su expediente empieza contigo" message="Registra su primera revisión, vacuna o tratamiento." />}</>}</div></section>;
}

function VetAgenda() {
  const { state } = useApp();
  const records = state.medicalRecords.filter((record) => record.nextDate && record.nextDate >= today()).sort((first, second) => (first.nextDate ?? "").localeCompare(second.nextDate ?? ""));
  return <section className="workspace-section"><PageHead eyebrow="CUIDADOS QUE CONTINÚAN" title="Agenda de seguimiento" description="Las próximas revisiones programadas desde los expedientes médicos."><button className="button secondary" onClick={() => exportCsv("agenda-veterinaria.csv", [["Fecha", "Mascota", "Tipo", "Veterinario", "Notas"], ...records.map((record) => [record.nextDate ?? "", state.pets.find((pet) => pet.id === record.petId)?.name ?? "", medicalLabels[record.kind], record.veterinarianName, record.notes])])}><ArrowDownToLine size={17} />Exportar CSV</button></PageHead><Stats items={[{ label: "Próximas revisiones", value: records.length, icon: CalendarDays, detail: "A partir de hoy" }, { label: "Revisiones de hoy", value: records.filter((record) => record.nextDate === today()).length, icon: Clock3, detail: formatDate(today()) }, { label: "Pacientes en seguimiento", value: new Set(records.map((record) => record.petId)).size, icon: PawPrint, detail: "Cuidado continuo" }]} /><div className="panel"><div className="panel-head"><h2>Próximas citas</h2><Link className="button ghost" href="/veterinario/expedientes"><Plus size={16} /> Registrar seguimiento</Link></div><UpcomingList /></div></section>;
}

function AdminHome() {
  const { state } = useApp();
  const reports = state.reports.filter((report) => report.status === "pendiente");
  return <section className="workspace-section"><PageHead eyebrow="UNA COMUNIDAD QUE CUIDA" title="Panel de administración" description="Una mirada a la comunidad y a las historias que estamos conectando." /><Stats items={[{ label: "Miembros activos", value: state.users.filter((user) => user.active).length, icon: Users, detail: `${state.users.length} cuentas registradas` }, { label: "Mascotas disponibles", value: state.pets.filter((pet) => pet.status === "disponible").length, icon: PawPrint, detail: `${state.pets.length} perfiles en la comunidad` }, { label: "Adopciones completadas", value: state.pets.filter((pet) => pet.status === "adoptado").length, icon: Heart, detail: "Nuevas familias formadas" }, { label: "Reportes pendientes", value: reports.length, icon: ShieldCheck, detail: "Necesitan tu atención" }]} /><div className="two-col"><div className="panel"><div className="panel-head"><h2>Reportes por atender</h2><Link className="button ghost" href="/admin/reportes">Ver reportes <ArrowRight size={16} /></Link></div>{reports.length ? <div className="stack">{reports.slice(0, 4).map((report) => { const pet = state.pets.find((item) => item.id === report.petId); return <Link href="/admin/reportes" className="compact-pet" key={report.id}><img className="avatar" src={pet?.image} alt="" /><div><strong>{pet?.name ?? "Perfil reportado"}</strong><p className="muted">{report.reason}</p></div><span className="badge amber">Pendiente</span></Link>; })}</div> : <Empty title="La comunidad está al día" message="No hay reportes pendientes de revisión." />}</div><div className="panel"><div className="panel-head"><h2>La comunidad en números</h2><Activity size={22} /></div><div className="stack">{(["ADOPTANTE", "REFUGIO", "VETERINARIO", "ADMIN"] as Role[]).map((role) => <div className="compact-pet" key={role}><span className="metric-icon">{role === "REFUGIO" ? <PawPrint size={20} /> : role === "VETERINARIO" ? <Stethoscope size={20} /> : <Users size={20} />}</span><strong>{roleLabels[role]}</strong><span className="badge green">{state.users.filter((user) => user.role === role).length}</span></div>)}</div><div className="form-actions"><Link className="button secondary" href="/admin/usuarios">Administrar usuarios <ArrowRight size={16} /></Link></div></div></div></section>;
}

function AdminUsers() {
  const { state, mutate, toast } = useApp();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("todos");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const users = state.users.filter((user) => (role === "todos" || user.role === role) && `${user.name} ${user.email}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  async function toggle(id: string) {
    setPendingId(id);
    try { if (await mutate({ type: "user.toggle", id })) toast("El estado de la cuenta se actualizó."); }
    finally { setPendingId(null); }
  }
  return <section className="workspace-section"><PageHead eyebrow="PERSONAS QUE HACEN LA DIFERENCIA" title="Usuarios de la comunidad" description="Gestiona el acceso de adoptantes, refugios y profesionales."><button className="button secondary" onClick={() => exportCsv("usuarios-patamatch.csv", [["Nombre", "Correo", "Rol", "Estado"], ...users.map((user) => [user.name, user.email, roleLabels[user.role], user.active ? "Activo" : "Suspendido"])])}><ArrowDownToLine size={17} />Exportar CSV</button></PageHead><div className="panel"><div className="panel-head"><SearchBox value={query} onChange={setQuery} placeholder="Buscar por nombre o correo" /><label className="field"><span className="field-label">Tipo de cuenta</span><select className="select" value={role} onChange={(event) => setRole(event.target.value)}><option value="todos">Todos los roles</option>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>{users.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acceso</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong>{user.id === state.user?.id && <p className="helper">Tu cuenta</p>}</td><td>{user.email}</td><td>{user.id === state.user?.id ? <span className="badge green">{roleLabels[user.role]}</span> : <select className="select" style={{ padding: "4px 8px", fontSize: "0.82rem", minHeight: "34px", width: "auto" }} value={user.role} disabled={pendingId === user.id} aria-label={`Cambiar rol de ${user.name}`} onChange={async (event) => { const nextRole = event.target.value as Role; setPendingId(user.id); try { if (await mutate({ type: "user.role", id: user.id, role: nextRole })) { toast(`El rol de ${user.name} ahora es ${roleLabels[nextRole]}.`); } } finally { setPendingId(null); } }}>{Object.entries(roleLabels).map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</select>}</td><td><span className={`badge ${user.active ? "green" : "red"}`}>{user.active ? "Activo" : "Suspendido"}</span></td><td><button className={`button ${user.active ? "ghost" : "secondary"}`} disabled={pendingId === user.id || user.id === state.user?.id} onClick={() => void toggle(user.id)}>{pendingId === user.id ? "Guardando…" : user.id === state.user?.id ? "Sesión actual" : user.active ? "Suspender" : "Reactivar"}</button></td></tr>)}</tbody></table></div> : <Empty title="Sin usuarios con esos datos" message="Ajusta la búsqueda o el tipo de cuenta." />}</div></section>;
}

function AdminReports() {
  const { state, mutate, toast } = useApp();
  const [status, setStatus] = useState("pendiente");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const reports = state.reports.filter((report) => status === "todos" || report.status === status);
  async function resolve(id: string) {
    setPendingId(id);
    try { if (await mutate({ type: "report.resolve", id })) toast("Reporte marcado como resuelto."); }
    finally { setPendingId(null); }
  }
  return <section className="workspace-section"><PageHead eyebrow="UN ESPACIO SEGURO PARA TODOS" title="Reportes de la comunidad" description="Revisa cada caso y ayuda a mantener información confiable." /><div className="panel"><div className="panel-head"><h2>{reports.length} {reports.length === 1 ? "reporte" : "reportes"}</h2><label className="field"><span className="field-label">Estado</span><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="pendiente">Pendientes</option><option value="resuelto">Resueltos</option><option value="todos">Todos los reportes</option></select></label></div>{reports.length ? <div className="record-list">{reports.map((report) => { const pet = state.pets.find((item) => item.id === report.petId); return <article className="record-item" key={report.id}><img className="avatar" src={pet?.image} alt="" /><div><div className="row"><h3>{pet?.name ?? "Perfil de mascota"}</h3><span className={`badge ${report.status === "pendiente" ? "amber" : "green"}`}>{report.status === "pendiente" ? "Pendiente" : "Resuelto"}</span></div><p>{report.reason}</p><p className="helper">{pet?.shelterName ?? "Refugio"} · Reporte {report.id}</p><Link className="button ghost" href={`/admin/mascotas?mascota=${report.petId}`}>Revisar perfil <ArrowRight size={15} /></Link></div>{report.status === "pendiente" && <button className="button secondary" disabled={pendingId === report.id} onClick={() => void resolve(report.id)}><CheckCircle2 size={17} />{pendingId === report.id ? "Guardando…" : "Marcar resuelto"}</button>}</article>; })}</div> : <Empty title="Todo en orden por aquí" message={status === "pendiente" ? "No hay reportes pendientes. Gracias por cuidar a la comunidad." : "No hay reportes con este estado."} />}</div></section>;
}

function AdminPets() {
  const { state, mutate, toast } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => { setSelectedId(new URLSearchParams(window.location.search).get("mascota") ?? ""); }, []);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pets = state.pets.filter((pet) => (status === "todos" || pet.status === status) && (!selectedId || pet.id === selectedId) && `${pet.name} ${pet.shelterName} ${pet.city}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  async function update(pet: Pet, next: Pet["status"]) {
    setPendingId(pet.id);
    try { if (await mutate({ type: "pet.update", id: pet.id, changes: { status: next } })) toast(`El perfil de ${pet.name} se actualizó.`); }
    finally { setPendingId(null); }
  }
  return <section className="workspace-section"><PageHead eyebrow="HISTORIAS QUE MERECEN CONFIANZA" title="Catálogo de mascotas" description="Supervisa los perfiles y su disponibilidad en la comunidad." /><div className="panel"><div className="panel-head"><SearchBox value={query} onChange={setQuery} placeholder="Buscar mascota, refugio o ciudad" /><label className="field"><span className="field-label">Disponibilidad</span><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos los estados</option>{Object.entries(petStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{selectedId && <button className="button secondary" onClick={() => setSelectedId("")}>Ver todo el catálogo</button>}</div>{pets.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Mascota</th><th>Refugio</th><th>Salud y cuidados</th><th>Moderar disponibilidad</th></tr></thead><tbody>{pets.map((pet) => <tr key={pet.id}><td><div className="row"><img className="avatar" src={pet.image} alt={pet.name} /><div><strong>{pet.name}</strong><p className="helper">{pet.breed} · {pet.city}</p></div></div><p className="helper">{pet.description}</p></td><td>{pet.shelterName}</td><td><p>{pet.health}</p><p className="helper">Vacunas {pet.vaccinated ? "al día" : "por confirmar"} · {pet.neutered ? "Esterilizado/a" : "Sin esterilizar"}</p></td><td><select className="select" value={pet.status} disabled={pendingId === pet.id || pet.status === "en_proceso" || pet.status === "adoptado"} aria-label={`Disponibilidad de ${pet.name}`} onChange={(event) => void update(pet, event.target.value as Pet["status"])}>{Object.entries(petStatusLabels).filter(([value]) => ["en_proceso", "adoptado"].includes(pet.status) ? value === pet.status : ["disponible", "pausado"].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{["en_proceso", "adoptado"].includes(pet.status) && <p className="helper">Estado gestionado desde la solicitud de adopción.</p>}{pendingId === pet.id && <span className="helper">Guardando…</span>}</td></tr>)}</tbody></table></div> : <Empty title="No encontramos perfiles" message="Prueba con otra búsqueda o cambia los filtros." />}</div></section>;
}

export function Workspace({ path }: { path: string[] }) {
  const { loading } = useApp();
  if (loading) return <div className="panel empty-state" role="status"><PawPrint size={30} /><p>Cargando tu espacio…</p></div>;
  const [role, section] = path;
  if (role === "refugio") {
    if (!section) return <ShelterHome />;
    if (section === "mascotas") return <ShelterPets />;
    if (section === "registro") return <PetEditor />;
    if (section === "solicitudes") return <ShelterApplications key="solicitudes" />;
    if (section === "entrevistas") return <ShelterApplications key="entrevistas" interviews />;
  }
  if (role === "veterinario") {
    if (!section) return <VetHome />;
    if (section === "expedientes") return <VetRecords />;
    if (section === "agenda") return <VetAgenda />;
  }
  if (role === "admin") {
    if (!section) return <AdminHome />;
    if (section === "usuarios") return <AdminUsers />;
    if (section === "reportes") return <AdminReports />;
    if (section === "mascotas") return <AdminPets />;
  }
  return <div className="panel"><Empty title="Esta página no está disponible" message="Regresa a tu espacio para continuar."><Link className="button primary" href={`/${["refugio", "veterinario", "admin"].includes(role) ? role : ""}`}>Ir al inicio</Link></Empty></div>;
}
