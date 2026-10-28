"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Info, PawPrint, Printer, ShieldCheck, X } from "lucide-react";
import type { AdoptionApplication, Pet } from "@/lib/types";

interface CertificateProps {
  application: AdoptionApplication;
  pet?: Pet;
}

interface Props extends CertificateProps {
  onClose: () => void;
}

export function AdoptionCertificateContent({ application, pet }: CertificateProps) {
  const completionEvent = application.events.find(event => event.status === "adoptada");
  const date = completionEvent ? new Date(completionEvent.at) : null;
  const completionDate = date && Number.isFinite(date.getTime())
    ? date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "No registrada";
  const species = pet ? { perro: "Perro", gato: "Gato", otro: "Otra especie" }[pet.species] : "No disponible";

  return <div id="printable-certificate" className="certificate-card">
    <div className="certificate-header">
      <div className="certificate-heading">
        <div className="row">
          <span className="brand-mark"><PawPrint size={22} /></span>
          <div><h3>PataMatch</h3><p>Comprobante digital de adopción</p></div>
        </div>
        <div className="certificate-status">
          <span className="badge green"><Award size={14} /> Adopción completada</span>
          <p>{application.folio}</p>
        </div>
      </div>
      <div className="certificate-banner">
        <h2 id="certificate-title">Una nueva historia juntos</h2>
        <p>Se registra la adopción de <strong>{pet?.name ?? "la mascota de esta solicitud"}</strong> por <strong>{application.adopterName}</strong>, tras completar el proceso en PataMatch.</p>
      </div>
    </div>
    <div className="certificate-body two-col">
      <section className="panel certificate-section">
        <h3>Datos de la mascota</h3>
        <div className="row certificate-pet">
          {pet?.image && <img src={pet.image} alt={pet.name} />}
          <div><h4>{pet?.name ?? "Información no disponible"}</h4><p>{pet?.breed ?? "Raza no disponible"} · {pet ? pet.sex === "hembra" ? "Hembra" : "Macho" : "Sexo no disponible"}</p></div>
        </div>
        <dl className="certificate-facts">
          <div><dt>Especie</dt><dd>{species}</dd></div>
          <div><dt>Refugio responsable</dt><dd>{pet?.shelterName ?? "No disponible"}</dd></div>
          <div><dt>Ciudad</dt><dd>{pet?.city ?? "No disponible"}</dd></div>
        </dl>
        {pet ? <div className="chips certificate-health">
          <span className={`badge ${pet.vaccinated ? "green" : "amber"}`}>{pet.vaccinated ? "Vacunas al día" : "Vacunas por confirmar"}</span>
          <span className={`badge ${pet.neutered ? "green" : "amber"}`}>{pet.neutered ? "Esterilizado/a" : "Esterilización pendiente"}</span>
        </div> : <p className="helper">No hay información de salud disponible.</p>}
      </section>
      <section className="panel certificate-section">
        <h3>Familia adoptante</h3>
        <dl className="certificate-facts">
          <div><dt>Nombre</dt><dd>{application.adopterName}</dd></div>
          <div><dt>Teléfono</dt><dd>{application.phone}</dd></div>
          <div><dt>Fecha de adopción</dt><dd>{completionDate}</dd></div>
        </dl>
        <p className="certificate-commitment"><strong>Compromiso de cuidado</strong>Alimentación, atención veterinaria y bienestar durante toda su vida en un hogar seguro.</p>
      </section>
    </div>
    <div className="certificate-validation"><ShieldCheck size={20} /><p><strong>Adopción completada en PataMatch</strong>Comprobante generado con la solicitud y la ficha actual de la mascota. La información de la ficha puede actualizarse.</p></div>
  </div>;
}

export function AdoptionCertificateModal({ application, pet, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(<dialog
    ref={dialogRef}
    className="modal certificate-modal"
    aria-labelledby="certificate-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
  >
    <div className="certificate-tools no-print"><button ref={closeRef} className="button icon secondary" type="button" aria-label="Cerrar comprobante" onClick={onClose}><X size={20} /></button></div>
    {application.status === "adoptada" ? <AdoptionCertificateContent application={application} pet={pet} /> : <h2 id="certificate-title">Esta solicitud aún no tiene una adopción completada.</h2>}
    <div className="no-print stack certificate-controls">
      <div className="inline-notice"><Info size={16} /><p>Para descargar una copia limpia, desactiva «Encabezados y pies de página» en las opciones de impresión.</p></div>
      <div className="certificate-actions">
        <button className="button secondary" type="button" onClick={onClose}>Cerrar</button>
        {application.status === "adoptada" && <button className="button primary" type="button" onClick={() => window.print()}><Printer size={16} />Imprimir / Guardar en PDF</button>}
      </div>
    </div>
  </dialog>, document.body);
}
