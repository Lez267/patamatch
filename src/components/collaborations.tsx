"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import { useApp } from "./app-provider";
import { VeterinarianCard } from "./veterinarian-card";
import { MedicalRecordMeta } from "./medical-record-meta";
import type { Collaboration, Command, VeterinaryProfile } from "@/lib/types";

const statusLabels: Record<Collaboration["status"], string> = {
  PENDING: "Pendiente", ACCEPTED: "Activa", REJECTED: "Rechazada", CANCELLED: "Cancelada", ENDED: "Finalizada",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function VeterinaryAvailability() {
  const { state, mutate, toast } = useApp();
  const [profile, setProfile] = useState<VeterinaryProfile>(state.veterinaryProfile ?? { clinicName: "", phone: "", city: "", specialty: "", bio: "", available: false });
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (await mutate({ type: "veterinary.profile", ...profile })) toast("Tu disponibilidad se actualizó.");
    } finally { setSaving(false); }
  }
  return <form className="panel stack" onSubmit={save}>
    <h2>Tu perfil profesional</h2>
    <p className="muted">Tú decides si recibes nuevas solicitudes. Ocultarte del directorio no termina las colaboraciones que ya aceptaste.</p>
    <div className="two-col">
      <label className="field"><span className="field-label">Nombre de la veterinaria (opcional)</span><input className="input" value={profile.clinicName} maxLength={120} onChange={(event) => setProfile({ ...profile, clinicName: event.target.value })} /></label>
      <label className="field"><span className="field-label">Teléfono de la veterinaria (opcional)</span><input className="input" type="tel" autoComplete="tel" value={profile.phone} maxLength={30} placeholder="Ej. 228 555 0100" onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /><span className="helper">10 a 15 dígitos; puedes incluir lada internacional. Se publica solo si activas tu disponibilidad.</span></label>
      <label className="field"><span className="field-label">Ciudad de atención</span><input className="input" value={profile.city} maxLength={100} required={profile.available} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></label>
      <label className="field"><span className="field-label">Área de atención</span><input className="input" value={profile.specialty} maxLength={120} required={profile.available} placeholder="Ej. Medicina general de perros y gatos" onChange={(event) => setProfile({ ...profile, specialty: event.target.value })} /></label>
    </div>
    <label className="field"><span className="field-label">Acerca de tu atención (opcional)</span><textarea className="textarea" rows={3} maxLength={1000} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
    <label className="checkbox-row"><input type="checkbox" checked={profile.available} onChange={(event) => setProfile({ ...profile, available: event.target.checked })} />Quiero aparecer como disponible y compartir mi nombre, correo y estos datos con los refugios registrados.</label>
    <div className="form-actions"><span className="helper">Aceptar una solicitud permite consultar y registrar atenciones de las mascotas de ese refugio.</span><button className="button primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar disponibilidad"}</button></div>
  </form>;
}

export function CollaborationsPage() {
  const { state, mutate, refresh, toast } = useApp();
  const shelterView = state.user?.role === "REFUGIO";
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState("todos");
  const veterinarians = state.veterinarians.filter((veterinarian) => `${veterinarian.name} ${veterinarian.email} ${veterinarian.city} ${veterinarian.specialty}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const collaborations = state.collaborations.filter((collaboration) => status === "todos" || collaboration.status === status);
  async function act(command: Command, id: string, success: string) {
    setPending(id);
    try {
      const saved = await mutate(command);
      if (saved) { toast(success); setSelectedId(""); setMessage(""); }
    } finally { setPending(null); }
  }
  async function reload() {
    setPending("refresh");
    try { await refresh(); toast("Solicitudes actualizadas."); }
    catch { toast("No pudimos actualizar. Intenta de nuevo."); }
    finally { setPending(null); }
  }
  return <section className="workspace-section collaboration-workspace">
    <div className="page-head"><div><p className="eyebrow">UNA RED PARA CUIDAR MEJOR</p><h1 className="page-title">{shelterView ? "Equipo veterinario" : "Mis refugios"}</h1><p className="page-subtitle">{shelterView ? "Encuentra profesionales disponibles y solicita su colaboración." : "Responde invitaciones y consulta a tus pacientes por refugio."}</p></div><button className="button secondary" disabled={pending !== null} onClick={() => void reload()}><RefreshCw size={17} aria-hidden="true" />Actualizar</button></div>
    {!shelterView && <VeterinaryAvailability />}
    {shelterView && <div className="panel stack">
      <div className="panel-head"><h2>Veterinarios disponibles</h2><label className="field"><span className="field-label">Buscar profesional</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, correo, ciudad o atención" /></label></div>
      <p className="helper">Solo aparecen cuentas con rol Veterinario que eligieron publicar su disponibilidad. Los datos profesionales son declarados por cada persona; no equivalen a una acreditación verificada.</p>
      {!veterinarians.length && <p className="empty-state">{state.veterinarians.length ? "No hay coincidencias con tu búsqueda." : "Todavía no hay veterinarios disponibles. El profesional debe activar su disponibilidad desde Mis refugios."}</p>}
      <div className="collaboration-directory">{veterinarians.map((veterinarian) => {
        const existing = state.collaborations.find((collaboration) => collaboration.veterinarianId === veterinarian.id);
        const blocked = existing?.status === "PENDING" || existing?.status === "ACCEPTED";
        return <VeterinarianCard veterinarian={veterinarian} key={veterinarian.id}>
          {blocked ? <span className="badge green">{existing.status === "ACCEPTED" ? "Ya colabora contigo" : "Solicitud enviada"}</span> : selectedId === veterinarian.id ? <form className="stack" onSubmit={(event) => { event.preventDefault(); void act({ type: "collaboration.request", veterinarianId: veterinarian.id, message }, veterinarian.id, "Solicitud enviada. El veterinario debe aceptarla antes de acceder a tus mascotas."); }}>
            <label className="field"><span className="field-label">Mensaje para {veterinarian.name}</span><textarea className="textarea" value={message} minLength={10} maxLength={1000} required rows={3} placeholder="Presenta tu refugio y el apoyo que necesitas." onChange={(event) => setMessage(event.target.value)} /></label>
            <p className="helper">Compartirás el nombre y correo de tu refugio. Si acepta, podrá consultar los expedientes de tus mascotas y registrar atenciones.</p>
            <div className="workspace-actions"><button className="button primary" type="submit" disabled={pending !== null}>{pending === veterinarian.id ? "Enviando…" : "Enviar solicitud"}</button><button className="button ghost" type="button" disabled={pending !== null} onClick={() => { setSelectedId(""); setMessage(""); }}>Cancelar</button></div>
          </form> : <button className="button secondary" disabled={pending !== null} onClick={() => { setSelectedId(veterinarian.id); setMessage(""); }}>Solicitar colaboración</button>}
        </VeterinarianCard>;
      })}</div>
    </div>}
    <div className="panel stack">
      <div className="panel-head"><h2>Solicitudes y colaboraciones</h2><label className="field"><span className="field-label">Estado de colaboración</span><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <p className="helper">Una solicitud pendiente no concede acceso. Cualquiera de las dos partes puede finalizar una colaboración sin borrar los registros médicos.</p>
      {!collaborations.length && <p className="empty-state">No hay solicitudes con este estado.</p>}
      {collaborations.map((collaboration) => <article className="collaboration-person stack" key={collaboration.id}>
        <div className="row"><h3>{shelterView ? collaboration.veterinarianName : collaboration.shelterName}</h3><span className={`badge ${collaboration.status === "ACCEPTED" ? "green" : "amber"}`}>{statusLabels[collaboration.status]}</span></div>
        <p className="muted">{shelterView ? collaboration.veterinarianEmail : collaboration.shelterEmail}</p><p>{collaboration.message}</p><p className="helper">Última actualización: {dateLabel(collaboration.updatedAt)}</p>
        {!collaboration.participantsActive && <p className="error">Una cuenta ya no está activa o cambió de rol. No se permite acceso clínico.</p>}
        <div className="workspace-actions">
          {!shelterView && collaboration.status === "PENDING" && collaboration.participantsActive && <><button className="button primary" disabled={pending !== null} onClick={() => void act({ type: "collaboration.respond", id: collaboration.id, accept: true }, collaboration.id, "Colaboración aceptada. Ya puedes consultar sus mascotas.")}><Check size={17} aria-hidden="true" />Aceptar solicitud</button><button className="button secondary" disabled={pending !== null} onClick={() => void act({ type: "collaboration.respond", id: collaboration.id, accept: false }, collaboration.id, "Solicitud rechazada.")}>Rechazar</button></>}
          {(collaboration.status === "ACCEPTED" || shelterView && collaboration.status === "PENDING") && <button className="button ghost" disabled={pending !== null} onClick={() => {
            if (window.confirm(collaboration.status === "PENDING" ? "¿Cancelar esta solicitud?" : "¿Finalizar la colaboración? El veterinario dejará de acceder a estos expedientes; los registros se conservarán.")) void act({ type: "collaboration.end", id: collaboration.id }, collaboration.id, "Colaboración cerrada. Los historiales se conservan.");
          }}>{pending === collaboration.id ? "Guardando…" : collaboration.status === "PENDING" ? "Cancelar solicitud" : "Finalizar colaboración"}</button>}
        </div>
        {!shelterView && collaboration.status === "ACCEPTED" && collaboration.participantsActive && <ShelterPatients shelterId={collaboration.shelterId} />}
      </article>)}
    </div>
    {shelterView && <div className="panel stack"><h2>Atenciones de tus mascotas</h2><p className="helper">El historial se conserva aunque finalice una colaboración.</p>{state.medicalRecords.length ? state.medicalRecords.map((record) => <article className="collaboration-person" key={record.id}><h3>{state.pets.find((pet) => pet.id === record.petId)?.name ?? "Mascota"}</h3><p>{record.notes}</p><MedicalRecordMeta record={record} /></article>) : <p className="muted">Aún no hay atenciones registradas.</p>}</div>}
  </section>;
}

function ShelterPatients({ shelterId }: { shelterId: string }) {
  const { state } = useApp();
  const pets = state.pets.filter((pet) => pet.shelterId === shelterId);
  return <div className="stack"><h4>Mascotas del refugio ({pets.length})</h4>{pets.length ? <div className="two-col">{pets.map((pet) => <Link className="compact-pet" href={`/veterinario/expedientes?mascota=${encodeURIComponent(pet.id)}`} key={pet.id}><img className="avatar" src={pet.image} alt="" /><div><strong>{pet.name}</strong><p className="helper">{pet.breed} · {pet.city}</p></div><ArrowRight size={17} aria-hidden="true" /></Link>)}</div> : <p className="muted">Este refugio aún no tiene mascotas registradas.</p>}</div>;
}

export function VeterinaryPatientsByShelter() {
  const { state } = useApp();
  const active = state.collaborations.filter((collaboration) => collaboration.status === "ACCEPTED" && collaboration.participantsActive);
  return <div className="panel stack"><div className="panel-head"><h2>Pacientes por refugio</h2><Link className="button secondary" href="/veterinario/refugios">Gestionar refugios</Link></div>{active.length ? active.map((collaboration) => <section className="collaboration-person stack" key={collaboration.id}><h3>{collaboration.shelterName}</h3><ShelterPatients shelterId={collaboration.shelterId} /></section>) : <p className="muted">Todavía no tienes colaboraciones activas. Publica tu disponibilidad y acepta una solicitud en Mis refugios para ver sus mascotas.</p>}</div>;
}

export function AdminAuditPage() {
  const { state, refresh, toast } = useApp();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const labels: Record<string, string> = { "user.role": "Cambio de rol", "user.toggle": "Suspensión / reactivación", "collaboration.request": "Solicitud de colaboración", "collaboration.respond": "Respuesta a solicitud", "collaboration.end": "Fin de colaboración" };
  const events = state.auditEvents.filter((event) => `${event.actorName} ${event.actorId} ${event.targetName} ${event.targetId} ${labels[event.action] ?? event.action}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  function changes(values: Record<string, unknown>) {
    const names: Record<string, string> = { role: "Rol", active: "Acceso", status: "Estado" };
    const roles: Record<string, string> = { ADMIN: "Administrador", VETERINARIO: "Veterinario", REFUGIO: "Refugio", ADOPTANTE: "Adoptante", ...statusLabels };
    return Object.entries(values).map(([key, value]) => `${names[key] ?? key}: ${value === null ? "Sin solicitud previa" : typeof value === "boolean" ? value ? "Activo" : "Suspendido" : roles[String(value)] ?? String(value)}`).join(" · ");
  }
  return <section className="workspace-section collaboration-workspace">
    <div className="page-head">
      <div><p className="eyebrow">TRAZABILIDAD DE LA COMUNIDAD</p><h1 className="page-title">Bitácora de actividad</h1><p className="page-subtitle">Quién realizó cada cambio y cómo estaba antes. Solo consulta.</p></div>
      <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { await refresh(); } catch { toast("No pudimos actualizar la bitácora."); } finally { setBusy(false); } }}>Actualizar</button>
    </div>
    <div className="panel stack">
      <label className="field"><span className="field-label">Buscar en la bitácora</span><input type="search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Responsable, cuenta o acción" /></label>
      <p className="helper">Últimos 200 eventos. Se registra actividad desde la incorporación de esta función; los cambios anteriores y los realizados directamente en Neon no aparecen aquí.</p>
      {events.length ? events.map((event) => <article className="collaboration-person stack" key={event.id}>
        <div className="row"><h2>{labels[event.action] ?? event.action}</h2><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time></div>
        <p><strong>{event.actorName}</strong> ({event.actorRole}) → {event.targetName}</p>
        <p className="helper">Responsable: {event.actorId} · Destino: {event.targetId}</p>
        <dl className="audit-values"><div><dt>Antes</dt><dd>{changes(event.before)}</dd></div><div><dt>Después</dt><dd>{changes(event.after)}</dd></div></dl>
        <p className="helper">Referencia: {event.id}</p>
      </article>) : <p className="empty-state">No hay eventos que mostrar.</p>}
    </div>
  </section>;
}
