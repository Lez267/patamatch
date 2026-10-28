"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Heart, Home, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useApp } from "@/components/app-provider";
import type { Age, Energy, Level, LifestyleProfile, Size, Species } from "@/lib/types";

function Choice({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`choice-button ${active ? "active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
      {active && <Check size={17} />}
    </button>
  );
}

interface WizardData {
  housing: "casa" | "departamento" | null;
  space: Size | "";
  yard: boolean | null;
  rental: boolean | null;
  permission: boolean | null;
  children: boolean | null;
  youngChildren: boolean | null;
  otherPets: Species[];
  otherPetsSelected: boolean;
  experience: "ninguna" | "basica" | "intermedia" | "avanzada" | "";
  hoursAway: number | null;
  backupCare: boolean | null;
  activity: Energy | "";
  allergies: boolean | null;
  species: "perro" | "gato" | "cualquiera" | "";
  size: Size | "cualquiera" | "";
  age: Age | "cualquiera" | "";
  budget: Level | "";
  city: string;
}

const emptyWizard: WizardData = {
  housing: null,
  space: "",
  yard: null,
  rental: null,
  permission: null,
  children: null,
  youngChildren: null,
  otherPets: [],
  otherPetsSelected: false,
  experience: "",
  hoursAway: null,
  backupCare: null,
  activity: "",
  allergies: null,
  species: "",
  size: "",
  age: "",
  budget: "",
  city: "",
};

export function TestWizard() {
  const { state, mutate, toast } = useApp();
  const router = useRouter();
  const storageKey = `patamatch-test-${state.user?.id}`;

  const [profile, setProfile] = useState<WizardData>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (saved) return { ...emptyWizard, ...JSON.parse(saved) };
    } catch {}

    if (state.profile?.completed) {
      return {
        housing: state.profile.housing,
        space: state.profile.space,
        yard: state.profile.yard,
        rental: state.profile.rental,
        permission: state.profile.permission,
        children: state.profile.children,
        youngChildren: state.profile.youngChildren,
        otherPets: state.profile.otherPets,
        otherPetsSelected: true,
        experience: state.profile.experience,
        hoursAway: state.profile.hoursAway,
        backupCare: state.profile.backupCare,
        activity: state.profile.activity,
        allergies: state.profile.allergies,
        species: (state.profile.species === "otro" ? "cualquiera" : state.profile.species) as "perro" | "gato" | "cualquiera",
        size: state.profile.size,
        age: state.profile.age,
        budget: state.profile.budget,
        city: state.profile.city,
      };
    }

    return emptyWizard;
  });

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = <Key extends keyof WizardData>(key: Key, value: WizardData[Key]) => {
    setError("");
    setProfile(previous => ({ ...previous, [key]: value }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
    } catch {}
  }, [profile, storageKey]);

  const titles = ["Tu hogar y tu experiencia", "Tu día a día", "Lo que buscas"];

  function togglePet(species: Species) {
    setError("");
    setProfile(previous => {
      const exists = previous.otherPets.includes(species);
      const next = exists ? previous.otherPets.filter(item => item !== species) : [...previous.otherPets, species];
      return { ...previous, otherPets: next, otherPetsSelected: true };
    });
  }

  function validateStep0(): string | null {
    if (!profile.housing) return "Por favor indica dónde vives (Casa o Departamento).";
    if (!profile.space) return "Por favor selecciona el tamaño de tu espacio.";
    if (profile.yard === null) return "Por favor indica si cuentas con patio o jardín.";
    if (profile.rental === null) return "Por favor indica si tu vivienda es propia o rentada.";
    if (profile.rental === true && profile.permission === null) return "Por favor confirma si cuentas con permiso para tener mascotas en tu renta.";
    if (profile.children === null) return "Por favor indica si hay niñas o niños en casa.";
    if (profile.children === true && profile.youngChildren === null) return "Por favor indica si hay menores de 12 años en el hogar.";
    if (!profile.otherPetsSelected) return "Por favor indica si tienes otras mascotas o selecciona 'Ninguna'.";
    if (!profile.experience) return "Por favor selecciona tu nivel de experiencia cuidando mascotas.";
    return null;
  }

  function validateStep1(): string | null {
    if (profile.hoursAway === null) return "Por favor indica cuántas horas al día estás fuera de casa.";
    if (profile.backupCare === null) return "Por favor indica si alguien puede apoyarte con sus cuidados ante imprevistos.";
    if (!profile.activity) return "Por favor selecciona el nivel de actividad habitual en tu hogar.";
    if (profile.allergies === null) return "Por favor indica si alguien en casa presenta sospecha o diagnóstico de alergias.";
    return null;
  }

  function validateStep2(): string | null {
    if (!profile.species) return "Por favor indica qué tipo de compañía estás buscando.";
    if (!profile.size) return "Por favor selecciona el tamaño preferido de mascota.";
    if (!profile.age) return "Por favor selecciona la etapa de vida preferida.";
    if (!profile.budget) return "Por favor selecciona tu disponibilidad de presupuesto para cuidados.";
    if (profile.city.trim().length < 2) return "Por favor escribe tu ciudad para calcular la cercanía.";
    return null;
  }

  function handleNext() {
    setError("");
    if (step === 0) {
      const err = validateStep0();
      if (err) {
        setError(err);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setStep(1);
    } else if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setStep(2);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleStepClick(targetIndex: number) {
    if (targetIndex === step) return;
    if (targetIndex > step) {
      if (step === 0) {
        const err = validateStep0();
        if (err) { setError(err); return; }
      }
      if (step === 1 || (step === 0 && targetIndex === 2)) {
        const err = validateStep1();
        if (err) { setError(err); return; }
      }
    }
    setError("");
    setStep(targetIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish() {
    setError("");
    const err0 = validateStep0();
    if (err0) { setStep(0); setError(err0); return; }
    const err1 = validateStep1();
    if (err1) { setStep(1); setError(err1); return; }
    const err2 = validateStep2();
    if (err2) { setError(err2); window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    setSaving(true);
    const finalProfile: LifestyleProfile = {
      housing: profile.housing as "casa" | "departamento",
      space: profile.space as Size,
      yard: Boolean(profile.yard),
      rental: Boolean(profile.rental),
      permission: profile.rental ? Boolean(profile.permission) : true,
      children: Boolean(profile.children),
      youngChildren: profile.children ? Boolean(profile.youngChildren) : false,
      otherPets: profile.otherPets,
      experience: profile.experience as LifestyleProfile["experience"],
      hoursAway: Number(profile.hoursAway ?? 4),
      backupCare: Boolean(profile.backupCare),
      activity: profile.activity as Energy,
      allergies: Boolean(profile.allergies),
      species: profile.species as LifestyleProfile["species"],
      size: profile.size as LifestyleProfile["size"],
      age: profile.age as LifestyleProfile["age"],
      budget: profile.budget as Level,
      city: profile.city.trim(),
      completed: true,
    };

    if (await mutate({ type: "profile.save", profile: finalProfile })) {
      localStorage.removeItem(storageKey);
      toast("Tu perfil está listo. Ya puedes descubrir tu match.");
      router.push("/match");
    }
    setSaving(false);
  }

  return (
    <div className="wizard-panel">
      <div className="page-head">
        <div>
          <span className="eyebrow">Una buena adopción empieza con conocerte</span>
          <h1 className="page-title">
            {!state.profile?.completed && state.user?.name
              ? `¡Hola, ${state.user.name.split(" ")[0]}! Tu test de Match`
              : "Tu test de Match"}
          </h1>
          <p className="page-subtitle">
            Tres pasos con preguntas obligatorias para encontrar una compañía que encaje contigo. Podrás editar tus respuestas después.
          </p>
        </div>
        <Sparkles size={34} />
      </div>

      <div className="stepper" aria-label={`Paso ${step + 1} de 3`}>
        {["Tu hogar", "Tu rutina", "Preferencias"].map((title, index) => (
          <button
            type="button"
            key={title}
            onClick={() => handleStepClick(index)}
            className={`step-dot ${index <= step ? "active" : ""}`}
            aria-current={index === step ? "step" : undefined}
          >
            <span>{index < step ? <Check size={17} /> : index + 1}</span>
            {title}
          </button>
        ))}
      </div>

      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${((step + 1) / 3) * 100}%` }} />
      </div>

      <section className="panel stack">
        <div className="panel-head">
          <h2>{titles[step]}</h2>
          <span className="badge subtle">Paso {step + 1} de 3 · Campos obligatorios</span>
        </div>

        {error && (
          <div className="notice warning" role="alert" style={{ marginBottom: "14px" }}>
            <p><strong>Atención:</strong> {error}</p>
          </div>
        )}

        {step === 0 && (
          <>
            <div className="field">
              <span className="field-label"><Home size={18} /> ¿Dónde vives? *</span>
              <div className="choice-grid">
                <Choice active={profile.housing === "casa"} onClick={() => update("housing", "casa")}>
                  Casa
                </Choice>
                <Choice active={profile.housing === "departamento"} onClick={() => update("housing", "departamento")}>
                  Departamento
                </Choice>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Tamaño del espacio en tu hogar *</label>
              <select
                className="select"
                required
                value={profile.space}
                onChange={event => update("space", event.target.value as Size)}
              >
                <option value="" disabled>Selecciona el tamaño del espacio…</option>
                <option value="pequeno">Pequeño (estudio o departamento compacto)</option>
                <option value="mediano">Mediano (departamento amplio o casa mediana)</option>
                <option value="grande">Grande (casa espaciosa con áreas amplias)</option>
              </select>
            </div>

            <div className="field">
              <span className="field-label">¿Cuentas con patio o jardín privado? *</span>
              <div className="choice-grid">
                <Choice active={profile.yard === true} onClick={() => update("yard", true)}>
                  Sí, tengo patio o jardín
                </Choice>
                <Choice active={profile.yard === false} onClick={() => update("yard", false)}>
                  No tengo patio
                </Choice>
              </div>
            </div>

            <div className="field">
              <span className="field-label">Régimen de tu vivienda *</span>
              <div className="choice-grid">
                <Choice
                  active={profile.rental === false}
                  onClick={() => {
                    update("rental", false);
                    update("permission", true);
                  }}
                >
                  Vivienda propia
                </Choice>
                <Choice
                  active={profile.rental === true}
                  onClick={() => {
                    update("rental", true);
                    update("permission", null);
                  }}
                >
                  Vivienda rentada
                </Choice>
              </div>
            </div>

            {profile.rental === true && (
              <div className="field">
                <span className="field-label">¿Cuentas con permiso del arrendador para vivir con mascotas? *</span>
                <div className="choice-grid">
                  <Choice active={profile.permission === true} onClick={() => update("permission", true)}>
                    Sí, tengo permiso confirmado
                  </Choice>
                  <Choice active={profile.permission === false} onClick={() => update("permission", false)}>
                    No tengo permiso / Por confirmar
                  </Choice>
                </div>
                {profile.permission === false && (
                  <p className="notice" style={{ marginTop: "10px" }}>
                    Podrás explorar el catálogo, pero el permiso de arrendamiento es un requisito obligatorio para enviar solicitudes formales.
                  </p>
                )}
              </div>
            )}

            <div className="divider" />
            <h3><UsersRound size={19} /> ¿Con quién compartiría su hogar?</h3>

            <div className="field">
              <span className="field-label">¿Viven niñas o niños en casa? *</span>
              <div className="choice-grid">
                <Choice
                  active={profile.children === true}
                  onClick={() => {
                    update("children", true);
                    update("youngChildren", null);
                  }}
                >
                  Sí, viven menores
                </Choice>
                <Choice
                  active={profile.children === false}
                  onClick={() => {
                    update("children", false);
                    update("youngChildren", false);
                  }}
                >
                  No hay menores en casa
                </Choice>
              </div>
            </div>

            {profile.children === true && (
              <div className="field">
                <span className="field-label">¿Hay menores de 12 años? *</span>
                <div className="choice-grid">
                  <Choice active={profile.youngChildren === true} onClick={() => update("youngChildren", true)}>
                    Sí, menores de 12 años
                  </Choice>
                  <Choice active={profile.youngChildren === false} onClick={() => update("youngChildren", false)}>
                    Mayores de 12 años
                  </Choice>
                </div>
              </div>
            )}

            <div className="field">
              <span className="field-label">¿Ya tienes otras mascotas en casa? *</span>
              <div className="chips">
                {(["perro", "gato", "otro"] as Species[]).map(species => (
                  <button
                    className={`chip ${profile.otherPets.includes(species) ? "active" : ""}`}
                    type="button"
                    key={species}
                    aria-pressed={profile.otherPets.includes(species)}
                    onClick={() => togglePet(species)}
                  >
                    {species === "perro" ? "Perros" : species === "gato" ? "Gatos" : "Otras especies"}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip ${profile.otherPetsSelected && profile.otherPets.length === 0 ? "active" : ""}`}
                  aria-pressed={profile.otherPetsSelected && profile.otherPets.length === 0}
                  onClick={() => {
                    setError("");
                    setProfile(previous => ({ ...previous, otherPets: [], otherPetsSelected: true }));
                  }}
                >
                  Ninguna
                </button>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Tu experiencia cuidando mascotas *</label>
              <select
                className="select"
                required
                value={profile.experience}
                onChange={event => update("experience", event.target.value as LifestyleProfile["experience"])}
              >
                <option value="" disabled>Selecciona tu nivel de experiencia…</option>
                <option value="ninguna">Será mi primera mascota</option>
                <option value="basica">He cuidado mascotas antes de forma básica</option>
                <option value="intermedia">Tengo experiencia habitual y conocimientos de cuidado</option>
                <option value="avanzada">Tengo amplia experiencia con cuidados especiales o entrenamiento</option>
              </select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field">
              <span className="field-label">¿Cuántas horas al día estás fuera de casa? *</span>
              <div className="chips" style={{ marginBottom: "12px" }}>
                {[0, 2, 4, 6, 8, 10].map(h => (
                  <button
                    type="button"
                    key={h}
                    className={`chip ${profile.hoursAway === h ? "active" : ""}`}
                    onClick={() => update("hoursAway", h)}
                  >
                    {h === 0 ? "Todo el día en casa (0h)" : `${h} horas`}
                  </button>
                ))}
              </div>
              <div className="row">
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={profile.hoursAway ?? 4}
                  onChange={event => update("hoursAway", Number(event.target.value))}
                />
                <strong>{profile.hoursAway !== null ? `${profile.hoursAway} h` : "Sin responder"}</strong>
              </div>
              <span className="helper">Considera tus horarios habituales de trabajo, escuela o actividades.</span>
            </div>

            <div className="field">
              <span className="field-label">¿Cuentas con apoyo para sus cuidados si tienes una emergencia o viaje? *</span>
              <div className="choice-grid">
                <Choice active={profile.backupCare === true} onClick={() => update("backupCare", true)}>
                  Sí, cuento con apoyo
                </Choice>
                <Choice active={profile.backupCare === false} onClick={() => update("backupCare", false)}>
                  No, me encargo yo solo/a
                </Choice>
              </div>
            </div>

            <div className="field">
              <span className="field-label">¿Cómo es el nivel de actividad habitual en tu hogar? *</span>
              <div className="choice-grid">
                {([
                  ["baja", "Tranquilo", "Prefiero los planes en casa y ritmo relajado"],
                  ["media", "Moderado", "Disfruto caminar y salir los fines de semana"],
                  ["alta", "Activo", "Hago ejercicio diario y paseos largos"],
                ] as const).map(([value, title, caption]) => (
                  <Choice
                    key={value}
                    active={profile.activity === value}
                    onClick={() => update("activity", value)}
                  >
                    <span><strong>{title}</strong><small>{caption}</small></span>
                  </Choice>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">¿Alguien en casa presenta sospecha o diagnóstico de alergia a perros o gatos? *</span>
              <div className="choice-grid">
                <Choice active={profile.allergies === true} onClick={() => update("allergies", true)}>
                  Sí, hay alergias
                </Choice>
                <Choice active={profile.allergies === false} onClick={() => update("allergies", false)}>
                  No hay alergias
                </Choice>
              </div>
              {profile.allergies === true && (
                <p className="notice" style={{ marginTop: "12px" }}>
                  Por bienestar mutuo, el algoritmo señalará exclusión si declaras alergias. El refugio puede orientarte para evaluar casos con supervisión médica.
                </p>
              )}
            </div>

            <div className="notice">
              <ShieldCheck size={20} />
              <p>Buscamos una convivencia sostenible. Tus respuestas sinceras ayudan a cuidar tu bienestar y el de la mascota.</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="field">
              <span className="field-label">¿Qué tipo de compañía estás buscando? *</span>
              <div className="chips">
                {([["perro", "Perro"], ["gato", "Gato"], ["cualquiera", "Abierto a conocer cualquiera"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip ${profile.species === value ? "active" : ""}`}
                    aria-pressed={profile.species === value}
                    onClick={() => update("species", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                Tamaño preferido *
                <select
                  className="select"
                  required
                  value={profile.size}
                  onChange={event => update("size", event.target.value as Size | "cualquiera")}
                >
                  <option value="" disabled>Selecciona el tamaño…</option>
                  <option value="cualquiera">Cualquier tamaño</option>
                  <option value="pequeno">Pequeño</option>
                  <option value="mediano">Mediano</option>
                  <option value="grande">Grande</option>
                </select>
              </label>

              <label className="field">
                Etapa de vida preferida *
                <select
                  className="select"
                  required
                  value={profile.age}
                  onChange={event => update("age", event.target.value as Age | "cualquiera")}
                >
                  <option value="" disabled>Selecciona la etapa de vida…</option>
                  <option value="cualquiera">Cualquier etapa</option>
                  <option value="cachorro">Cachorro</option>
                  <option value="joven">Joven</option>
                  <option value="adulto">Adulto</option>
                  <option value="senior">Senior</option>
                </select>
              </label>
            </div>

            <div className="field">
              <label className="field-label">Disponibilidad de presupuesto para cubrir sus cuidados *</label>
              <select
                className="select"
                required
                value={profile.budget}
                onChange={event => update("budget", event.target.value as Level)}
              >
                <option value="" disabled>Selecciona tu disponibilidad de presupuesto…</option>
                <option value="bajo">Cuidados básicos (alimentación de calidad y vacunas)</option>
                <option value="medio">Cuidados habituales y fondo para eventualidades médicas</option>
                <option value="alto">También puedo asumir tratamientos o cuidados especiales</option>
              </select>
              <span className="helper">El presupuesto orienta la conversación con el refugio; no afecta negativamente el porcentaje.</span>
            </div>

            <label className="field">
              <span><MapPin size={17} /> ¿En qué ciudad vives? *</span>
              <input
                className="input"
                required
                maxLength={80}
                value={profile.city}
                onChange={event => update("city", event.target.value)}
                placeholder="Ej. Xalapa, Veracruz"
              />
              <span className="helper">Se usa para calcular la cercanía geográfica con el refugio.</span>
            </label>

            <div className="notice">
              <Heart size={20} />
              <p>El resultado orienta tu búsqueda. La decisión de adopción se toma de mutuo acuerdo con el refugio.</p>
            </div>
          </>
        )}

        <div className="form-actions">
          <button
            className="button secondary"
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : router.push("/explorar"))}
          >
            <ArrowLeft size={17} />
            {step > 0 ? "Atrás" : "Guardar para después"}
          </button>

          {step < 2 ? (
            <button className="button primary" type="button" onClick={handleNext}>
              Continuar
              <ArrowRight size={17} />
            </button>
          ) : (
            <button className="button primary" disabled={saving} onClick={finish}>
              {saving ? "Calculando match…" : "Descubrir mi match"}
              <Sparkles size={18} />
            </button>
          )}
        </div>
      </section>

      <p className="helper">
        Tus respuestas se guardan en tu perfil seguro en PostgreSQL para recomendarte a tus compañeros ideales.
      </p>
    </div>
  );
}
