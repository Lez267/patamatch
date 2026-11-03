import { ArrowRight, ClipboardList } from "lucide-react";
import type { AuditEvent } from "@/lib/types";
import { auditChanges, auditDate, auditPresentation, auditRoleLabels } from "@/lib/audit-presentation";

export function AuditEntry({ event }: { event: AuditEvent }) {
  const presentation = auditPresentation(event);
  const date = auditDate(event.createdAt);
  return <article className="audit-event" aria-label={`${presentation.title}: ${event.targetName}`}>
    <header className="audit-event-header">
      <div className="audit-event-title"><span className="audit-event-icon"><ClipboardList size={21} aria-hidden="true" /></span><div><h2>{presentation.title}</h2><p>{presentation.explanation}</p></div></div>
      <time className="audit-event-date" dateTime={event.createdAt}><span>{date.day}</span><strong>{date.time}</strong><small>Ciudad de México</small></time>
    </header>
    <dl className="audit-people">
      <div><dt>Realizado por</dt><dd><strong>{event.actorName}</strong><span className="badge green">{auditRoleLabels[event.actorRole] ?? event.actorRole}</span></dd></div>
      <div><dt>{presentation.targetLabel}</dt><dd><strong>{event.targetName}</strong></dd></div>
    </dl>
    <div className="audit-comparison" role="group" aria-label="Comparación del cambio">
      <div className="audit-state audit-state-before"><h3>Antes del cambio</h3><dl>{auditChanges(event.before).map((change) => <div key={change.key}><dt>{change.label}</dt><dd>{change.value}</dd></div>)}</dl>{!Object.keys(event.before).length && <p>Sin datos anteriores.</p>}</div>
      <ArrowRight className="audit-change-arrow" size={22} aria-hidden="true" />
      <div className="audit-state audit-state-after"><h3>Después del cambio</h3><dl>{auditChanges(event.after).map((change) => <div key={change.key}><dt>{change.label}</dt><dd>{change.value}</dd></div>)}</dl>{!Object.keys(event.after).length && <p>Sin datos posteriores.</p>}</div>
    </div>
    <details className="audit-technical"><summary>Ver identificadores técnicos</summary><dl><div><dt>ID del evento</dt><dd><code>{event.id}</code></dd></div><div><dt>ID del responsable</dt><dd><code>{event.actorId}</code></dd></div><div><dt>ID del registro afectado</dt><dd><code>{event.targetId}</code></dd></div><div><dt>Acción registrada</dt><dd><code>{event.action}</code></dd></div></dl></details>
  </article>;
}
