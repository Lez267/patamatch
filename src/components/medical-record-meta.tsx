import type { MedicalRecord } from "@/lib/types";

export function MedicalRecordMeta({ record }: { record: MedicalRecord }) {
  const captured = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(record.createdAt));
  return <div className="medical-record-meta"><p><strong>Responsable de la atención:</strong> {record.veterinarianName}</p><p><strong>Fecha de atención:</strong> <time dateTime={record.date}>{record.date}</time></p><p className="helper">Capturado en el sistema: <time dateTime={record.createdAt}>{captured}</time> (hora de Ciudad de México). No indica la hora de la consulta.</p></div>;
}
