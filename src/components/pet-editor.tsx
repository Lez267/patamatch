"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Heart, ImagePlus, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import type { Pet, PetInput } from "@/lib/types";

const portraits = ["canela", "rocky", "luna", "mimi", "toby", "coco"];
const traits = ["Cariñoso", "Juguetón", "Tranquilo", "Sociable", "Curioso", "Independiente", "Leal", "Tímido"];
const steps = ["Datos generales", "Personalidad", "Salud y cuidados"];

function initialPet(pet?: Pet): PetInput {
  return {
    name: pet?.name ?? "", species: pet?.species ?? "perro", breed: pet?.breed ?? "",
    age: pet?.age ?? "joven", ageYears: pet?.ageYears ?? 1, sex: pet?.sex ?? "hembra",
    size: pet?.size ?? "mediano", energy: pet?.energy ?? "media", personality: pet?.personality ?? [],
    children: pet?.children ?? "supervision", otherPets: pet?.otherPets ?? "depende", care: pet?.care ?? "medio",
    health: pet?.health ?? "", vaccinated: pet?.vaccinated ?? false, neutered: pet?.neutered ?? false,
    regulated: pet?.regulated ?? false, description: pet?.description ?? "", city: pet?.city ?? "",
    image: pet?.image ?? "/pets/canela.jpg", status: pet?.status ?? "disponible",
  };
}

export function PetEditor({ pet, onClose }: { pet?: Pet; onClose?: () => void }) {
  const { mutate, toast } = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<PetInput>(() => initialPet(pet));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const setField = <Field extends keyof PetInput>(field: Field, value: PetInput[Field]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  };

  function validate(currentStep: number) {
    if (currentStep === 0) {
      if (draft.name.trim().length < 2) return "Por favor escribe el nombre de la mascota (mínimo 2 caracteres).";
      if (draft.breed.trim().length < 2) return "Por favor escribe la raza o mezcla de la mascota.";
      if (!Number.isFinite(draft.ageYears) || draft.ageYears < 0 || draft.ageYears > 35) return "La edad debe ser un número válido entre 0 y 35 años.";
      if (draft.city.trim().length < 2) return "Por favor escribe la ciudad donde se encuentra el refugio.";
      if (!draft.image) return "Por favor selecciona o sube una fotografía de la mascota.";
    }
    if (currentStep === 1) {
      if (!draft.personality.length) return "Selecciona al menos un rasgo de personalidad que describa a la mascota.";
      if (draft.description.trim().length < 20) return "Por favor cuéntanos la historia y necesidades de la mascota en al menos 20 caracteres.";
    }
    if (currentStep === 2) {
      if (draft.health.trim().length < 8) return "Por favor describe el estado de salud, vacunas o cuidados en al menos 8 caracteres.";
    }
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validate(step);
    if (validation) {
      setError(validation);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    for (let currentStep = 0; currentStep < 3; currentStep += 1) {
      const previousError = validate(currentStep);
      if (previousError) {
        setStep(currentStep);
        setError(previousError);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setSaving(true);
    try {
      const cleanDraft = { ...draft, name: draft.name.trim(), breed: draft.breed.trim(), city: draft.city.trim(), description: draft.description.trim(), health: draft.health.trim() };
      const success = await mutate(pet ? { type: "pet.update", id: pet.id, changes: cleanDraft } : { type: "pet.create", pet: cleanDraft });
      if (success) {
        toast(pet ? "Los cambios se guardaron." : `${draft.name} ya tiene su perfil de adopción.`);
        if (onClose) onClose();
        else router.push("/refugio/mascotas");
      }
    } finally { setSaving(false); }
  }

  const [isDragging, setIsDragging] = useState(false);

  function processImageFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Elige una imagen JPG, PNG o WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen debe pesar como máximo 2 MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setField("image", reader.result);
    };
    reader.onerror = () => setError("No pudimos leer esta imagen. Intenta con otra.");
    reader.readAsDataURL(file);
  }

  function readPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    event.target.value = "";
  }

  return (
    <section className="workspace-section">
      <div className="page-head"><div><p className="eyebrow">UN NUEVO COMIENZO</p><h1 className="page-title">{pet ? `Editar a ${pet.name}` : "Registra una nueva huellita"}</h1><p className="page-subtitle">Cada detalle nos ayuda a encontrar la familia indicada.</p></div>{onClose && <button type="button" className="button ghost" onClick={onClose}><ArrowLeft size={17} /> Volver a mascotas</button>}</div>
      <div className="stepper" aria-label="Pasos del registro">{steps.map((label, index) => <div key={label} className={`row${index === step ? " active" : ""}`} aria-current={index === step ? "step" : undefined}><span className={`step-dot${index <= step ? " active" : ""}`}>{index < step ? <Check size={16} /> : index + 1}</span><span>{label}</span></div>)}</div>
      <form className="panel wizard-panel" onSubmit={submit} noValidate>
        <div className="panel-head"><div><p className="eyebrow">PASO {step + 1} DE 3</p><h2>{steps[step]}</h2></div><span className="badge green">{pet ? "Editar perfil" : "Nuevo perfil"}</span></div>
        {step === 0 && <div className="stack">
          <div className="two-col">
            <div className="stack">
              <label className="field-label">Fotografía de la mascota</label>
              <div
                className={`drag-drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processImageFile(file);
                }}
                onClick={() => uploadRef.current?.click()}
                title="Haz clic o arrastra una fotografía aquí"
                style={{ cursor: "pointer", position: "relative" }}
              >
                <img className="attachment-preview" src={draft.image} alt={`Vista previa de ${draft.name || "la mascota"}`} />
                {isDragging && (
                  <div className="drag-overlay">
                    <ImagePlus size={36} />
                    <span>¡Suelta la fotografía aquí!</span>
                  </div>
                )}
              </div>
              <div className="photo-picker" aria-label="Fotografías disponibles">
                {portraits.map((name) => <button className={`photo-option${draft.image === `/pets/${name}.jpg` ? " active" : ""}`} type="button" key={name} aria-label={`Elegir fotografía de ${name}`} aria-pressed={draft.image === `/pets/${name}.jpg`} onClick={() => setField("image", `/pets/${name}.jpg`)}><img src={`/pets/${name}.jpg`} alt={name} /></button>)}
              </div>
              <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={readPhoto} hidden />
              <button className="button secondary" type="button" onClick={() => uploadRef.current?.click()}><ImagePlus size={17} /> Subir o tomar foto</button>
              <p className="helper">Arrastra una imagen aquí o sube JPG, PNG o WebP (máx. 2 MB).</p>
            </div>
            <div className="form-grid"><label className="field"><span className="field-label">Nombre *</span><input className="input" required value={draft.name} maxLength={60} placeholder="¿Cómo se llama?" onChange={(event) => setField("name", event.target.value)} /></label><label className="field"><span className="field-label">Especie</span><select className="select" value={draft.species} onChange={(event) => setField("species", event.target.value as PetInput["species"])}><option value="perro">Perro</option><option value="gato">Gato</option><option value="otro">Otra especie</option></select></label><label className="field"><span className="field-label">Raza o mezcla *</span><input className="input" required value={draft.breed} maxLength={80} placeholder="Ej. Mestizo, Labrador, Siamés..." onChange={(event) => setField("breed", event.target.value)} /></label><div className="two-col"><label className="field"><span className="field-label">Edad en años *</span><input className="input" required type="number" min="0" max="35" step="0.1" placeholder="Ej. 2" value={Number.isFinite(draft.ageYears) ? draft.ageYears : ""} onChange={(event) => setField("ageYears", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></label><label className="field"><span className="field-label">Etapa</span><select className="select" value={draft.age} onChange={(event) => setField("age", event.target.value as PetInput["age"])}><option value="cachorro">Cachorro</option><option value="joven">Joven</option><option value="adulto">Adulto</option><option value="senior">Senior</option></select></label></div><div className="two-col"><label className="field"><span className="field-label">Sexo</span><select className="select" value={draft.sex} onChange={(event) => setField("sex", event.target.value as PetInput["sex"])}><option value="hembra">Hembra</option><option value="macho">Macho</option></select></label><label className="field"><span className="field-label">Tamaño</span><select className="select" value={draft.size} onChange={(event) => setField("size", event.target.value as PetInput["size"])}><option value="pequeno">Pequeño</option><option value="mediano">Mediano</option><option value="grande">Grande</option></select></label></div><label className="field"><span className="field-label">Ciudad *</span><input className="input" required value={draft.city} maxLength={80} placeholder="Ej. Xalapa, Veracruz" onChange={(event) => setField("city", event.target.value)} /></label></div>
          </div>
        </div>}
        {step === 1 && <div className="stack"><div className="inline-notice"><Heart size={21} /><p>Su personalidad es el comienzo de una gran conexión. Ayúdanos a conocerle mejor.</p></div><div className="field"><span className="field-label">¿Cómo es? *</span><div className="chips">{Array.from(new Set([...traits, ...(pet?.personality ?? [])])).map((trait) => <button type="button" className={`chip${draft.personality.includes(trait) ? " active" : ""}`} key={trait} aria-pressed={draft.personality.includes(trait)} onClick={() => setField("personality", draft.personality.includes(trait) ? draft.personality.filter((item) => item !== trait) : [...draft.personality, trait])}>{draft.personality.includes(trait) && <Check size={14} />}{trait}</button>)}</div></div><div className="three-col"><label className="field"><span className="field-label">Nivel de energía</span><select className="select" value={draft.energy} onChange={(event) => setField("energy", event.target.value as PetInput["energy"])}><option value="baja">Baja · paseos tranquilos</option><option value="media">Media · disfruta jugar</option><option value="alta">Alta · mucha actividad</option></select></label><label className="field"><span className="field-label">Convivencia con niños</span><select className="select" value={draft.children} onChange={(event) => setField("children", event.target.value as PetInput["children"])}><option value="apto">Buena convivencia</option><option value="supervision">Con supervisión</option><option value="no">Hogar sin niños</option></select></label><label className="field"><span className="field-label">Con otras mascotas</span><select className="select" value={draft.otherPets} onChange={(event) => setField("otherPets", event.target.value as PetInput["otherPets"])}><option value="apto">Buena convivencia</option><option value="depende">Requiere presentación</option><option value="no">Prefiere ser mascota única</option></select></label></div><label className="field"><span className="field-label">Su historia *</span><textarea className="textarea" required rows={6} minLength={20} maxLength={2500} placeholder="Cuenta qué le gusta, cómo llegó al refugio y qué tipo de familia necesita…" value={draft.description} onChange={(event) => setField("description", event.target.value)} /><span className="helper">{draft.description.length}/2500 caracteres · mínimo 20</span></label></div>}
        {step === 2 && <div className="stack"><div className="inline-notice"><ShieldCheck size={23} /><p>Información clara y honesta para una adopción responsable.</p></div><div className="three-col"><label className="choice-check"><input type="checkbox" checked={draft.vaccinated} onChange={(event) => setField("vaccinated", event.target.checked)} /><span>Vacunas al día</span></label><label className="choice-check"><input type="checkbox" checked={draft.neutered} onChange={(event) => setField("neutered", event.target.checked)} /><span>Esterilizado/a</span></label><label className="choice-check"><input type="checkbox" checked={draft.regulated} onChange={(event) => setField("regulated", event.target.checked)} /><span>Requiere manejo especial</span></label></div><label className="field"><span className="field-label">Estado de salud y cuidados *</span><textarea className="textarea" required rows={5} maxLength={2000} placeholder="Describe su salud, tratamientos o necesidades especiales…" value={draft.health} onChange={(event) => setField("health", event.target.value)} /><span className="helper">Incluye cualquier condición relevante para su futura familia (mínimo 8 caracteres).</span></label><div className="two-col"><label className="field"><span className="field-label">Nivel de cuidados</span><select className="select" value={draft.care} onChange={(event) => setField("care", event.target.value as PetInput["care"])}><option value="bajo">Bajo · cuidados habituales</option><option value="medio">Medio · atención adicional</option><option value="alto">Alto · atención especializada</option></select></label><label className="field"><span className="field-label">Disponibilidad del perfil</span><select className="select" disabled={pet?.status === "en_proceso" || pet?.status === "adoptado"} value={draft.status} onChange={(event) => setField("status", event.target.value as PetInput["status"])}><option value="disponible">Disponible para adopción</option><option value="pausado">Guardar como pausado</option>{pet?.status === "en_proceso" && <option value="en_proceso">En proceso de adopción</option>}{pet?.status === "adoptado" && <option value="adoptado">Adoptado</option>}</select></label></div><div className="wizard-summary row"><img className="avatar" src={draft.image} alt="" /><div><strong>{draft.name}</strong><p className="muted">{draft.breed} · {draft.ageYears} {draft.ageYears === 1 ? "año" : "años"} · {draft.city}</p></div><span className="badge green">Listo para {pet ? "guardar" : "publicar"}</span></div></div>}
        {error && (
          <div className="notice warning" role="alert" style={{ marginBottom: "16px" }}>
            <p><strong>Falta información:</strong> {error}</p>
          </div>
        )}
        <div className="form-actions"><button type="button" className="button secondary" disabled={saving} onClick={() => { if (step > 0) { setStep(step - 1); setError(""); } else if (onClose) onClose(); else router.push("/refugio/mascotas"); }}><ArrowLeft size={17} />{step === 0 ? "Cancelar" : "Anterior"}</button><button className="button primary" type="submit" disabled={saving}>{saving ? "Guardando…" : step === 2 ? (pet ? "Guardar cambios" : draft.status === "pausado" ? "Guardar perfil" : "Publicar mascota") : "Continuar"}{step === 2 ? <Check size={17} /> : <ArrowRight size={17} />}</button></div>
      </form>
    </section>
  );
}
