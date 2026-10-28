"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion, animate } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart2, CalendarDays, Check, CheckCircle2, ChevronRight, FileCheck, FileText, Heart, Home, Info, Mail, MapPin, PawPrint, Radar, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Stethoscope, UserRound, X } from "lucide-react";
import { AdoptionCertificateModal } from "@/components/adoption-certificate";
import { useApp } from "@/components/app-provider";
import { TestWizard } from "@/components/test-wizard";
import { calculateMatch } from "@/lib/matching";
import { statusLabels, type AdoptionApplication, type Pet } from "@/lib/types";

export const sizeNames = { pequeno: "Pequeño", mediano: "Mediano", grande: "Grande" };
const ageNames = { cachorro: "Cachorro", joven: "Joven", adulto: "Adulto", senior: "Senior" };
const energyNames = { baja: "Tranquila", media: "Moderada", alta: "Alta" };
const formatDate = (value: string) => new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

const stageIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  enviada: Mail,
  en_revision: Search,
  entrevista: CalendarDays,
  visita: Home,
  aprobada: FileCheck,
  adoptada: Heart,
  rechazada: X,
  cancelada: X,
};

function Empty({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="empty-state"><PawPrint size={40} /><h2>{title}</h2><p>{description}</p>{children}</div>;
}

function Favorite({ pet }: { pet: Pet }) {
  const { state, mutate } = useApp();
  const [saving, setSaving] = useState(false);
  const favorite = state.favorites.includes(pet.id);
  return <button className={`favorite-btn ${favorite ? "active" : ""}`} disabled={saving} aria-label={`${favorite ? "Quitar a" : "Guardar a"} ${pet.name} de favoritos`} aria-pressed={favorite} onClick={async () => { setSaving(true); await mutate({ type: "favorite.toggle", petId: pet.id }); setSaving(false); }}><Heart size={19} fill={favorite ? "currentColor" : "none"} /></button>;
}

function PetCard({ pet }: { pet: Pet }) {
  const { state } = useApp();
  const match = calculateMatch(pet, state.profile);
  return <article className="pet-card"><div className="pet-photo"><Link href={`/mascotas/${pet.id}`} tabIndex={-1} aria-hidden="true"><img src={pet.image} alt="" loading="lazy" /></Link><span className={`match-badge ${!match.eligible ? "warning" : ""}`}><Sparkles size={13} />{match.score === null ? "Conóceme" : !match.eligible ? "Revisar requisitos" : `${match.score}% match`}</span><Favorite pet={pet} /></div><div className="pet-info"><div className="row between"><Link href={`/mascotas/${pet.id}`}><h2>{pet.name}</h2></Link><span className="pet-sex" aria-label={pet.sex}>{pet.sex === "hembra" ? "♀" : "♂"}</span></div><p className="pet-meta">{pet.breed} · {ageNames[pet.age]}</p><p className="pet-description">{pet.description}</p><div className="row between"><span className="muted pet-location"><MapPin size={13} />{pet.city}</span><Link className="text-link" href={`/mascotas/${pet.id}`}>Conocer<ArrowRight size={15} /></Link></div></div></article>;
}

function Explore({ initialFavorites = false }: { initialFavorites?: boolean }) {
  const { state } = useApp();
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState("todas");
  const [favorites, setFavorites] = useState(initialFavorites);
  const [size, setSize] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("compatibilidad");
  const pets = useMemo(() => state.pets.filter(pet => ["disponible", "en_proceso"].includes(pet.status) && (species === "todas" || pet.species === species) && (size === "todos" || pet.size === size) && (!favorites || state.favorites.includes(pet.id)) && `${pet.name} ${pet.breed} ${pet.city}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((first, second) => sort === "nombre" ? first.name.localeCompare(second.name) : (calculateMatch(second, state.profile).score ?? 0) - (calculateMatch(first, state.profile).score ?? 0)), [state, species, size, favorites, search, sort]);
  return <>
    <div className="page-head"><div><span className="eyebrow">Una nueva historia te espera</span><h1 className="page-title">Hola, {state.user?.name.split(" ")[0]} <span className="greeting-paw"><PawPrint size={29} /></span></h1><p className="page-subtitle">Encuentra una compañía que encaje con tu vida.</p></div><Link className="button secondary" href="/test"><SlidersHorizontal size={17} />{state.profile?.completed ? "Ajustar mi perfil" : "Hacer mi test"}</Link></div>
    <section className="hero-strip"><span className="hero-icon"><Heart size={28} /></span><div><h2>{state.profile?.completed ? "Cada conexión tiene una razón" : "Tu compañero ideal empieza por conocerte"}</h2><p>{state.profile?.completed ? "Tus recomendaciones consideran tu hogar, tu rutina y las necesidades de cada mascota." : "Responde el test y descubre qué mascotas son compatibles con tu día a día."}</p></div><Link href={state.profile?.completed ? "/match" : "/test"} className="button primary">{state.profile?.completed ? "Ver mi match" : "Comenzar"}<ArrowRight size={17} /></Link></section>
    <div className="search-bar"><label className="search-field"><Search size={20} /><input aria-label="Buscar por nombre, raza o ciudad" placeholder="Busca por nombre, raza o ciudad…" value={search} onChange={event => setSearch(event.target.value)} /></label><button className={`button secondary ${showFilters ? "selected" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={18} />Filtros</button></div>
    <div className="filter-bar"><div className="chips">{[["todas", "Todos"], ["perro", "Perros"], ["gato", "Gatos"], ["otro", "Otras mascotas"]].map(([value, label]) => <button key={value} className={`chip ${species === value ? "active" : ""}`} aria-pressed={species === value} onClick={() => setSpecies(value)}>{label}</button>)}<button className={`chip ${favorites ? "active" : ""}`} aria-pressed={favorites} onClick={() => setFavorites(!favorites)}><Heart size={15} fill={favorites ? "currentColor" : "none"} />Favoritos ({state.favorites.length})</button></div><span className="muted">{pets.length} {pets.length === 1 ? "compañero" : "compañeros"}</span></div>
    {favorites && (
      <div className="notice" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="row">
          <Heart size={18} fill="currentColor" />
          <span>Mostrando tus <strong>{pets.length}</strong> {pets.length === 1 ? "mascota favorita" : "mascotas favoritas guardadas"}</span>
        </div>
        <button className="button ghost small" onClick={() => setFavorites(false)}>
          Ver todo el catálogo
        </button>
      </div>
    )}
    {showFilters && <section className="panel form-grid"><label className="field">Tamaño<select className="select" value={size} onChange={event => setSize(event.target.value)}><option value="todos">Todos los tamaños</option>{Object.entries(sizeNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Ordenar por<select className="select" value={sort} onChange={event => setSort(event.target.value)}><option value="compatibilidad">Mayor compatibilidad</option><option value="nombre">Nombre</option></select></label></section>}
    <section aria-label="Mascotas disponibles" className="pet-grid">{pets.map(pet => <PetCard pet={pet} key={pet.id} />)}</section>
    {pets.length === 0 && <Empty title={favorites ? "Aún no tienes mascotas en favoritos" : "Todavía no hay coincidencias aquí"} description={favorites ? "Puedes tocar el corazón en el catálogo o en la pantalla de Match para guardar aquí a las mascotas que te interesen." : "Prueba con otra búsqueda, cambia los filtros o guarda mascotas en tus favoritos."}><button className="button secondary" onClick={() => { setSearch(""); setSpecies("todas"); setSize("todos"); setFavorites(false); }}>{favorites ? "Explorar todo el catálogo" : "Limpiar filtros"}</button></Empty>}
  </>;
}

function RadarChart({ factors }: { factors: Array<{ key: string; label: string; weight: number; score: number }> }) {
  const size = 440;
  const center = size / 2;
  const radius = 135;
  const total = factors.length;
  const levels = [0.25, 0.5, 0.75, 1];

  const getCoordinates = (index: number, valueFactor: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const r = radius * valueFactor;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      angle,
    };
  };

  const dataPoints = factors
    .map((factor, index) => {
      const { x, y } = getCoordinates(index, factor.score / 100);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "16px auto", width: "100%" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "100%", maxWidth: "480px", height: "auto", overflow: "visible" }}
      >
        {levels.map((level, lvlIdx) => {
          const points = factors
            .map((_, i) => {
              const { x, y } = getCoordinates(i, level);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={`grid-${lvlIdx}`}
              points={points}
              fill={lvlIdx === levels.length - 1 ? "#e4eee0" : "none"}
              stroke="#cad8c2"
              strokeWidth={lvlIdx === levels.length - 1 ? 1.5 : 1}
              strokeDasharray={lvlIdx < levels.length - 1 ? "4 4" : undefined}
            />
          );
        })}

        {levels.map((level, lvlIdx) => {
          const { y } = getCoordinates(0, level);
          return (
            <text
              key={`lvl-text-${lvlIdx}`}
              x={center + 6}
              y={y + 4}
              fontSize="10"
              fill="var(--muted)"
              fontWeight="700"
            >
              {Math.round(level * 100)}%
            </text>
          );
        })}

        {factors.map((factor, i) => {
          const outer = getCoordinates(i, 1);
          const labelCoord = getCoordinates(i, 1.25);
          const cos = Math.cos(outer.angle);
          const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";

          return (
            <g key={`axis-${factor.key}`}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="#c5d4be"
                strokeWidth="1.2"
              />
              <text
                x={labelCoord.x}
                y={labelCoord.y}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize="12"
                fontWeight="700"
                fill="var(--ink)"
              >
                {factor.label.split(" ")[0]}
                <tspan
                  x={labelCoord.x}
                  dy="13"
                  textAnchor={anchor}
                  fontSize="10"
                  fill="var(--muted)"
                  fontWeight="600"
                >
                  ({factor.weight}%)
                </tspan>
              </text>
            </g>
          );
        })}

        <polygon
          points={dataPoints}
          fill="rgba(79, 115, 88, 0.32)"
          stroke="var(--forest)"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {factors.map((factor, i) => {
          const { x, y } = getCoordinates(i, factor.score / 100);
          return (
            <g key={`point-${factor.key}`}>
              <circle cx={x} cy={y} r="5.5" fill="var(--forest)" stroke="#fff" strokeWidth="2.5" />
              <title>{`${factor.label}: ${factor.score}% (Importancia ${factor.weight}%)`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PetDetail({ id }: { id: string }) {
  const { state } = useApp();
  const [chartView, setChartView] = useState<"bars" | "radar">("bars");
  const pet = state.pets.find(item => item.id === id);
  if (!pet) return <Empty title="No encontramos esta mascota" description="Quizá su publicación cambió. Puedes seguir explorando el catálogo."><Link className="button primary" href="/explorar">Volver al catálogo</Link></Empty>;
  const match = calculateMatch(pet, state.profile);
  const petApplications = state.applications.filter(application => application.petId === id);
  const previous = petApplications.find(application => !["cancelada", "rechazada"].includes(application.status));
  const rejections = petApplications.filter(application => application.status === "rechazada").length;
  return <>
    <Link href="/explorar" className="back-link"><ArrowLeft size={17} />Volver a explorar</Link>
    <div className="detail-grid"><div><div className="detail-photo"><img src={pet.image} alt={`${pet.name}, ${pet.breed}, en adopción`} /><Favorite pet={pet} /><span className="match-badge"><Sparkles size={15} />{match.score === null ? "Una historia por conocer" : `${match.score}% match`}</span></div><div className="panel shelter-card"><HomeIcon /><div><strong>{pet.shelterName}</strong><p className="muted"><MapPin size={14} />{pet.city}</p></div><ShieldCheck size={20} /></div></div>
    <div className="detail-info"><div className="row between"><span className={`badge ${pet.status === "disponible" ? "green" : "amber"}`}>{pet.status === "disponible" ? "En busca de un hogar" : pet.status === "en_proceso" ? "Con solicitudes en proceso" : pet.status === "adoptado" ? "Ya encontró un hogar" : "Publicación pausada"}</span><span className="muted">{pet.sex === "hembra" ? "Hembra ♀" : "Macho ♂"}</span></div><h1 className="page-title">Hola, soy {pet.name}</h1><p className="page-subtitle">{pet.breed} · {pet.ageYears === 0 ? "Menos de un año" : `${pet.ageYears} ${pet.ageYears === 1 ? "año" : "años"}`} · {sizeNames[pet.size]}</p><p>{pet.description}</p><div className="chips">{pet.personality.map(item => <span className="chip" key={item}>{item}</span>)}</div>
      <div className="detail-facts"><div><span className="muted">Energía</span><strong>{energyNames[pet.energy]}</strong></div><div><span className="muted">Con niños</span><strong>{pet.children === "apto" ? "Buena convivencia" : pet.children === "supervision" ? "Con supervisión" : "No recomendado"}</strong></div><div><span className="muted">Con otras mascotas</span><strong>{pet.otherPets === "apto" ? "Compatible" : pet.otherPets === "depende" ? "Requiere presentación" : "Hogar sin mascotas"}</strong></div><div><span className="muted">Nivel de cuidado</span><strong>{pet.care === "bajo" ? "Básico" : pet.care === "medio" ? "Habitual" : "Especializado"}</strong></div></div>
      <div className="panel stack"><h2><Stethoscope size={20} /> Mi salud y bienestar</h2><p>{pet.health}</p><div className="chips"><span className={`badge ${pet.vaccinated ? "green" : "amber"}`}>{pet.vaccinated ? "Vacunas al día" : "Vacunas en proceso"}</span><span className={`badge ${pet.neutered ? "green" : "amber"}`}>{pet.neutered ? "Esterilizado/a" : "Esterilización pendiente"}</span></div></div>
      {!match.eligible && <div className="notice warning"><Info size={20} /><div><strong>Hay necesidades que debemos revisar</strong><ul>{match.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><Link className="text-link" href="/test">Revisar mi perfil<ArrowRight size={16} /></Link></div></div>}
      {match.manualReview && <p className="notice">Esta mascota necesita cuidados especiales. El refugio revisará tu experiencia antes de continuar.</p>}
      <div className="detail-actions">
        {rejections >= 3 ? (
          <div className="notice warning" style={{ width: "100%" }}>
            <Info size={20} />
            <div>
              <strong>Límite de solicitudes alcanzado</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                Has alcanzado el límite de 3 solicitudes para {pet.name}. Te sugerimos conocer a otras mascotas disponibles que se adapten mejor a tu hogar.
              </p>
            </div>
          </div>
        ) : previous ? (
          <Link className="button primary" href="/adopciones">Ver mi solicitud<ArrowRight size={18} /></Link>
        ) : !state.profile?.completed ? (
          <Link className="button primary" href="/test">Completar mi test<Sparkles size={18} /></Link>
        ) : match.eligible && pet.status === "disponible" ? (
          <Link className="button primary" href={`/solicitud/${pet.id}`}>Quiero adoptar a {pet.name}<Heart size={18} /></Link>
        ) : (
          <button className="button primary" disabled>Solicitud no disponible</button>
        )}
      </div>
    </div></div>
    <section className="panel compatibility-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Un resultado que puedes entender</span>
          <h2>Tu match con {pet.name}</h2>
        </div>
        <div className="row" style={{ alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {match.score !== null && (
            <div className="segmented-control" role="tablist" aria-label="Visualización de match">
              <button
                type="button"
                role="tab"
                aria-selected={chartView === "bars"}
                className={`segment-btn ${chartView === "bars" ? "active" : ""}`}
                onClick={() => setChartView("bars")}
              >
                <BarChart2 size={15} /> Barras
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartView === "radar"}
                className={`segment-btn ${chartView === "radar" ? "active" : ""}`}
                onClick={() => setChartView("radar")}
              >
                <Radar size={15} /> Radar
              </button>
            </div>
          )}
          {match.score !== null && <strong className="compatibility-score">{match.score}<small>/100</small></strong>}
        </div>
      </div>
      {match.score === null ? (
        <p>Completa tu test para ver el desglose de match. <Link className="text-link" href="/test">Hacer el test<ArrowRight size={16} /></Link></p>
      ) : (
        <>
          {chartView === "bars" ? (
            <div className="compatibility-bars">
              {match.factors.map(factor => (
                <div className="compatibility-row" key={factor.key}>
                  <div className="row between">
                    <span>{factor.label} <small className="muted">· Importancia {factor.weight}%</small></span>
                    <strong>{factor.score}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${factor.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <RadarChart factors={match.factors} />
          )}
          <details>
            <summary>¿Cómo se calcula este resultado?</summary>
            <p>Primero comprobamos los requisitos de convivencia. Después sumamos siete factores clave según su importancia: temperamento (25%), energía (20%), especie (15%), tamaño (15%), edad (10%), experiencia (10%) y cercanía (5%). Cada factor tiene coincidencia total, parcial o nula. El porcentaje orienta la búsqueda y el refugio evalúa cada solicitud.</p>
          </details>
        </>
      )}
    </section>
  </>;
}

function HomeIcon() { return <span className="brand-mark small"><PawPrint size={22} /></span>; }

function SwipeCardView({ pet, matchScore, children }: { pet: Pet; matchScore: number | null; children?: React.ReactNode }) {
  return (
    <article className="swipe-card">
      <div className="pet-photo">
        <img src={pet.image} alt={pet.name} draggable={false} />
        <span className="match-badge">
          <Sparkles size={15} />
          {matchScore !== null ? `${matchScore}% match` : "Match"}
        </span>
        {children}
        <div className="swipe-overlay">
          <h2>
            {pet.name} <span>{pet.sex === "hembra" ? "♀" : "♂"}</span>
          </h2>
          <p>{pet.breed} · {ageNames[pet.age]}</p>
        </div>
      </div>
      <div className="pet-info">
        <p>{pet.description}</p>
        <div className="chips">
          <span className="chip"><MapPin size={14} />{pet.city}</span>
          <span className="chip">{sizeNames[pet.size]}</span>
          <span className="chip">Energía {energyNames[pet.energy].toLowerCase()}</span>
        </div>
        <Link className="text-link" href={`/mascotas/${pet.id}`}>
          Conocer su historia<ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}

function Match() {
  const { state, mutate, toast } = useApp();
  const router = useRouter();
  const [position, setPosition] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const pets = useMemo(() => (
    state.pets
      .filter(pet => ["disponible", "en_proceso"].includes(pet.status) && calculateMatch(pet, state.profile).eligible)
      .sort((first, second) => (calculateMatch(second, state.profile).score ?? 0) - (calculateMatch(first, state.profile).score ?? 0))
  ), [state.pets, state.profile]);

  const pet = pets[position];
  const nextPet = pets[position + 1];

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-280, 0, 280], [-16, 0, 16]);
  const stampLikeOpacity = useTransform(x, [20, 100], [0, 1]);
  const stampLikeScale = useTransform(x, [20, 100], [0.8, 1]);
  const stampPassOpacity = useTransform(x, [-20, -100], [0, 1]);
  const stampPassScale = useTransform(x, [-20, -100], [0.8, 1]);

  // Dynamic reactions for background card
  const nextScale = useTransform(x, [-260, 0, 260], [1, 0.94, 1]);
  const nextY = useTransform(x, [-260, 0, 260], [0, 14, 0]);
  const nextOpacity = useTransform(x, [-260, 0, 260], [1, 0.65, 1]);

  useEffect(() => {
    x.set(0);
  }, [position, x]);

  async function triggerExit(direction: "right" | "left") {
    if (!pet || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (!reduceMotion && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(18); } catch {}
      }
      await animate(x, direction === "right" ? 580 : -580, {
        duration: reduceMotion ? 0 : 0.28,
        ease: [0.25, 1, 0.5, 1],
      });
      if (direction === "right") {
        const isFavorite = state.favorites.includes(pet.id);
        if (!isFavorite && !await mutate({ type: "favorite.toggle", petId: pet.id })) {
          await animate(x, 0, { duration: reduceMotion ? 0 : 0.2 });
          return;
        }
        toast(isFavorite ? `${pet.name} ya está en tus favoritos.` : `${pet.name} se guardó en tus favoritos.`);
      }
      setPosition(previous => previous + 1);
      x.set(0);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // Keyboard navigation for desktop users
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (!(target instanceof Element) || !stageRef.current?.contains(target)) return;
      if (target.closest("a, button, input, textarea, select, summary, [contenteditable]:not([contenteditable='false']), [role='button'], [role='tab'], [role='dialog']")) return;
      if (busyRef.current || !pet) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        void triggerExit("right");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        void triggerExit("left");
      } else if (event.key === "ArrowUp" || event.key === "Enter") {
        event.preventDefault();
        router.push(`/mascotas/${pet.id}`);
      } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "z" || event.key === "Backspace") {
        if (position > 0) {
          event.preventDefault();
          setPosition(prev => Math.max(0, prev - 1));
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pet, busy, position, router, state.favorites, mutate, toast, reduceMotion]);

  if (!state.profile?.completed) {
    return (
      <Empty title="Conozcámonos un poco primero" description="Completa el test para explorar mascotas compatibles con tu hogar, tu rutina y tus preferencias.">
        <Link className="button primary" href="/test">
          Comenzar mi test<Sparkles size={18} />
        </Link>
      </Empty>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Encuentra esa conexión</span>
          <h1 className="page-title">Tu próximo gran match</h1>
          <p className="page-subtitle">Conoce a cada mascota, guarda tus favoritas y tómate tu tiempo.</p>
        </div>
        <Link href="/test" className="button secondary">
          <SlidersHorizontal size={17} />Ajustar test
        </Link>
      </div>

      {!pet ? (
        <Empty
          title={pets.length ? "Ya conociste a todos por ahora" : "Vamos a revisar tus preferencias"}
          description={pets.length ? "Tus favoritos siguen en el catálogo. Puedes volver a recorrer las mascotas cuando quieras." : "Por ahora ninguna mascota cumple todos los requisitos de tu hogar. Puedes revisar los motivos en el catálogo."}
        >
          <button className="button secondary" onClick={() => setPosition(0)} disabled={!pets.length}>
            <RotateCcw size={17} />Volver a empezar
          </button>
          <Link className="button primary" href="/explorar">
            Ver catálogo<ArrowRight size={17} />
          </Link>
        </Empty>
      ) : (
        <div ref={stageRef} className="swipe-stage" tabIndex={0} role="region" aria-label="Explorar mascotas con flechas; Enter abre su historia">
          <div className="swipe-deck">
            {/* Siguiente tarjeta en el mazo (efecto visual de pila real) */}
            {nextPet && (
              <motion.div
                key={`next-${nextPet.id}`}
                className="swipe-card-wrapper next-card"
                style={{
                  scale: nextScale,
                  y: nextY,
                  opacity: nextOpacity,
                }}
              >
                <SwipeCardView
                  pet={nextPet}
                  matchScore={calculateMatch(nextPet, state.profile).score}
                />
              </motion.div>
            )}

            {/* Tarjeta principal activa arrastrable */}
            <motion.div
              key={`top-${pet.id}`}
              className="swipe-card-wrapper top-card"
              style={{ x, rotate, touchAction: "pan-y" }}
              drag={!busy ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.85}
              onDragEnd={async (_, info) => {
                const threshold = 85;
                const velocityThreshold = 350;
                if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
                  await triggerExit("right");
                } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
                  await triggerExit("left");
                } else {
                  if (reduceMotion) x.set(0);
                  else animate(x, 0, { type: "spring", stiffness: 420, damping: 28 });
                }
              }}
            >
              <SwipeCardView
                pet={pet}
                matchScore={calculateMatch(pet, state.profile).score}
              >
                <motion.div
                  className="swipe-stamp like"
                  style={{ opacity: stampLikeOpacity, scale: stampLikeScale }}
                >
                  <Heart size={20} fill="currentColor" />
                  <span>¡ME ENCANTA!</span>
                </motion.div>
                <motion.div
                  className="swipe-stamp pass"
                  style={{ opacity: stampPassOpacity, scale: stampPassScale }}
                >
                  <X size={22} />
                  <span>PASAR</span>
                </motion.div>
              </SwipeCardView>
            </motion.div>
          </div>

          <div className="swipe-actions">
            <button
              className="button icon secondary"
              disabled={position === 0 || busy}
              aria-label="Ver la mascota anterior (Atajo: Z)"
              title="Deshacer (Z)"
              onClick={() => setPosition(Math.max(0, position - 1))}
            >
              <RotateCcw size={23} />
            </button>
            <button
              className="button icon secondary swipe-btn-pass"
              disabled={busy}
              aria-label="Pasar a la siguiente mascota (Atajo: Flecha Izquierda)"
              title="Pasar (←)"
              onClick={() => void triggerExit("left")}
            >
              <X size={28} />
            </button>
            <button
              className="button icon primary swipe-btn-like"
              disabled={busy}
              aria-label={`Me interesa ${pet.name}; guardar en favoritos (Atajo: Flecha Derecha)`}
              title="Me encanta (→)"
              onClick={() => void triggerExit("right")}
            >
              <Heart size={27} />
            </button>
          </div>

          <div className="swipe-shortcuts-hint" aria-hidden="true">
            <span><kbd>←</kbd> Pasar</span>
            <span><kbd>↑</kbd> Historia</span>
            <span><kbd>→</kbd> Me encanta</span>
            <span><kbd>Z</kbd> Deshacer</span>
          </div>

          <p className="muted swipe-hint">
            {position + 1} de {pets.length} · Arrastra con el mouse/dedo o usa las flechas del teclado
          </p>
        </div>
      )}
    </>
  );
}

function AdoptionRequest({ petId }: { petId: string }) {
  const { state, mutate, toast } = useApp();
  const router = useRouter();
  const pet = state.pets.find(item => item.id === petId);
  const [motivation, setMotivation] = useState("");
  const [phone, setPhone] = useState("");
  const [commitments, setCommitments] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!pet) return <Empty title="No encontramos esa mascota" description="Vuelve al catálogo para elegir una mascota disponible."><Link href="/explorar" className="button primary">Explorar mascotas</Link></Empty>;
  const match = calculateMatch(pet, state.profile);
  const petApplications = state.applications.filter(application => application.petId === pet.id);
  const existing = petApplications.some(application => !["cancelada", "rechazada"].includes(application.status));
  const rejections = petApplications.filter(application => application.status === "rechazada").length;
  if (existing) return <Empty title="Tu solicitud ya está en camino" description={`Ya tienes una solicitud para ${pet.name}. Puedes consultar los siguientes pasos en Mis adopciones.`}><Link className="button primary" href="/adopciones">Ver mi solicitud</Link></Empty>;
  if (rejections >= 3) return <Empty title="Límite de solicitudes alcanzado" description={`Has alcanzado el límite de 3 solicitudes no procedentes para ${pet.name}. Te sugerimos conocer a otras mascotas disponibles.`}><Link className="button primary" href="/explorar">Explorar otras mascotas</Link></Empty>;
  if (!state.profile?.completed || !match.eligible || pet.status !== "disponible") return <Empty title="Revisemos los requisitos antes de continuar" description="Para solicitar una adopción, completa tu test y comprueba los requisitos de convivencia en la ficha."><Link className="button primary" href={`/mascotas/${pet.id}`}>Volver a la ficha</Link></Empty>;
  return <><Link className="back-link" href={`/mascotas/${pet.id}`}><ArrowLeft size={17} />Volver a la ficha</Link><div className="page-head"><div><span className="eyebrow">El primer paso hacia su nuevo hogar</span><h1 className="page-title">Tu solicitud para {pet.name}</h1><p className="page-subtitle">El refugio recibirá tu perfil y se pondrá en contacto contigo para continuar.</p></div></div><div className="two-col request-layout"><form className="panel stack" onSubmit={async event => { event.preventDefault(); setError(""); if (motivation.trim().length < 30) { setError("Cuéntanos un poco más: escribe al menos 30 caracteres."); return; } if (phone.replace(/\D/g, "").length !== 10) { setError("Escribe un teléfono de 10 dígitos."); return; } if (!commitments.every(Boolean)) { setError("Confirma los tres compromisos para enviar tu solicitud."); return; } setSaving(true); if (await mutate({ type: "application.create", petId: pet.id, motivation: motivation.trim(), phone: phone.replace(/\D/g, ""), commitment: true })) { toast("Solicitud enviada. Ya puedes consultar tu folio y seguimiento."); router.push("/adopciones"); } setSaving(false); }}>{rejections > 0 && <div className="notice warning"><Info size={18} /><p>Esta es tu solicitud #{rejections + 1} de 3 permitidas para {pet.name}. Recuerda detallar cómo han mejorado tus condiciones para su cuidado.</p></div>}<h2>Cuéntanos sobre ti</h2><div className="form-grid"><label className="field">Nombre<input className="input" value={state.user?.name ?? ""} readOnly /></label><label className="field">Correo<input className="input" value={state.user?.email ?? ""} readOnly /></label></div><label className="field">Teléfono de contacto<input className="input" type="tel" inputMode="tel" autoComplete="tel-national" required minLength={10} maxLength={16} placeholder="10 dígitos" value={phone} onChange={event => setPhone(event.target.value)} /></label><label className="field">¿Por qué quieres adoptar a {pet.name}?<textarea className="textarea" rows={5} minLength={30} maxLength={2000} required value={motivation} onChange={event => setMotivation(event.target.value)} placeholder="Cuéntanos cómo sería su vida contigo, quién apoyaría en sus cuidados y qué te conectó con su historia." /><span className="helper">{motivation.length}/2000 caracteres · mínimo 30</span></label><h3>Una adopción responsable</h3>{["Confirmo que mi hogar puede recibir a la mascota y que las personas que viven conmigo están de acuerdo.", "Me comprometo a cubrir su alimentación, atención veterinaria y bienestar durante toda su vida.", "Acepto participar en la entrevista y el seguimiento del refugio; enviar la solicitud no garantiza la aprobación."].map((text, index) => <label key={text} className="checkbox-row"><input type="checkbox" required checked={commitments[index]} onChange={event => setCommitments(previous => previous.map((value, item) => item === index ? event.target.checked : value))} />{text}</label>)}{error && <p className="error" role="alert">{error}</p>}<button className="button primary" disabled={saving}>{saving ? "Enviando solicitud…" : "Enviar mi solicitud"}<Heart size={18} /></button></form><aside className="stack"><div className="pet-card"><img className="pet-image" src={pet.image} alt={pet.name} /><div className="pet-info"><h2>{pet.name}</h2><p>{pet.breed} · {sizeNames[pet.size]}</p><span className="badge green"><Sparkles size={14} />{match.score}% match</span><p className="muted">{pet.shelterName} · {pet.city}</p></div></div><div className="notice"><ShieldCheck size={22} /><p>Tu solicitud se comparte con el refugio responsable. Podrás ver cada actualización en Mis adopciones.</p></div></aside></div></>;
}

function ApplicationCard({ application }: { application: AdoptionApplication }) {
  const { state, mutate, toast } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [busy, setBusy] = useState(false);
  const pet = state.pets.find(item => item.id === application.petId);
  const terminal = ["adoptada", "cancelada", "rechazada"].includes(application.status);
  const steps = ["enviada", "en_revision", "entrevista", "visita", "aprobada", "adoptada"];
  const current = steps.indexOf(application.status);
  const sortedEvents = useMemo(() => [...application.events].reverse(), [application.events]);

  return (
    <article className="panel stack">
      <div className="row between application-card-head">
        <div className="row">
          <img className="avatar pet-avatar" src={pet?.image ?? "/pets/coco.jpg"} alt={pet?.name ?? "Mascota"} />
          <div>
            <h2>{pet?.name ?? "Mascota"}</h2>
            <span className="muted">{application.folio} · {formatDate(application.createdAt)}</span>
          </div>
        </div>
        <span className={`badge ${["rechazada", "cancelada"].includes(application.status) ? "red" : application.status === "adoptada" ? "green" : "amber"}`}>
          {statusLabels[application.status]}
        </span>
      </div>

      {!["rechazada", "cancelada"].includes(application.status) && (
        <ol className="application-stepper">
          {steps.map((status, index) => (
            <li key={status} className={index <= current ? "active" : ""}>
              <span>{index < current ? <Check size={13} /> : index + 1}</span>
              <small>{statusLabels[status as keyof typeof statusLabels]}</small>
            </li>
          ))}
        </ol>
      )}

      <details open={!terminal}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Ver seguimiento y mi solicitud ({sortedEvents.length} {sortedEvents.length === 1 ? "evento" : "actualizaciones"})
        </summary>
        <div className="stack" style={{ marginTop: "14px", gap: "12px" }}>
          <div className="row between" style={{ alignItems: "baseline" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
              Historial de avances
            </span>
          </div>
          <div className="timeline">
            {sortedEvents.map((event, index) => {
              const Icon = stageIcons[event.status] ?? CheckCircle2;
              const isCurrent = index === 0;
              return (
                <div key={`${event.at}-${index}`} className={`timeline-item ${isCurrent ? "current" : ""}`}>
                  <span className={`step-dot ${isCurrent ? "active" : ""}`} style={isCurrent ? { boxShadow: "0 0 0 4px #cce1c4" } : undefined}>
                    <Icon size={14} />
                  </span>
                  <div>
                    <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                      <strong>{statusLabels[event.status]}</strong>
                      {isCurrent && <span className="badge green small">Actual</span>}
                    </div>
                    <small className="muted">{formatDate(event.at)}</small>
                    {event.note && (
                      <p style={{ marginTop: "4px", color: "var(--ink)", fontWeight: isCurrent ? 500 : 400 }}>
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider" style={{ margin: "4px 0" }} />
          <p><strong>Tu motivación:</strong> {application.motivation}</p>
          <p className="muted">Contacto registrado: {application.phone}</p>
        </div>
      </details>

      <div className="row between application-card-actions" style={{ alignItems: "center" }}>
        <Link href={`/mascotas/${application.petId}`} className="text-link">
          Ver ficha<ChevronRight size={17} />
        </Link>
        <div className="row" style={{ gap: "8px" }}>
          {application.status === "adoptada" && (
            <button
              className="button primary"
              type="button"
              onClick={() => setShowCertificate(true)}
              style={{ padding: "8px 15px", fontSize: "0.85rem" }}
            >
              <FileText size={16} /> Ver comprobante digital
            </button>
          )}
          {!terminal && (
            <button className="button ghost" onClick={() => setConfirmCancel(true)}>
              Cancelar solicitud
            </button>
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

      {confirmCancel && (
        <div className="notice stack">
          <strong>¿Quieres cancelar esta solicitud?</strong>
          <p>El refugio podrá ver la cancelación. Podrás volver a solicitar si la mascota sigue disponible.</p>
          <div className="row">
            <button className="button secondary" onClick={() => setConfirmCancel(false)} disabled={busy}>
              Conservar solicitud
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (await mutate({ type: "application.status", id: application.id, status: "cancelada", note: "El adoptante decidió cancelar su solicitud." })) {
                  setConfirmCancel(false);
                  toast("Tu solicitud se canceló.");
                }
                setBusy(false);
              }}
            >
              Confirmar cancelación
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Applications() {
  const { state } = useApp();
  return <><div className="page-head"><div><span className="eyebrow">Acompañamos cada paso</span><h1 className="page-title">Mis adopciones</h1><p className="page-subtitle">Consulta tus folios, las actualizaciones del refugio y lo que sigue en tu proceso.</p></div><span className="badge green">{state.applications.length} solicitudes</span></div>{state.applications.length ? <div className="stack">{[...state.applications].sort((first, second) => second.createdAt.localeCompare(first.createdAt)).map(application => <ApplicationCard application={application} key={application.id} />)}</div> : <Empty title="Tu próxima historia empieza aquí" description="Cuando envíes una solicitud, aquí encontrarás tu folio y todos los pasos del proceso."><Link href="/explorar" className="button primary">Conocer mascotas<ArrowRight size={17} /></Link></Empty>}</>;
}

function Profile() {
  const { state, logout } = useApp();
  return <><div className="page-head"><div><span className="eyebrow">Tu espacio en PataMatch</span><h1 className="page-title">Mi perfil</h1><p className="page-subtitle">Tus datos y preferencias ayudan a encontrar una convivencia que funcione.</p></div><UserRound size={33} /></div><div className="two-col"><section className="panel stack"><div className="row"><span className="avatar large">{state.user?.name[0]}</span><div><h2>{state.user?.name}</h2><span className="badge green">Adoptante</span></div></div><div className="divider" /><label className="field">Correo electrónico<input className="input" value={state.user?.email ?? ""} readOnly /></label><div className="detail-facts"><Link href="/favoritos" className="stat-card-link" title="Ver mis mascotas favoritas"><span className="muted">Favoritos</span><strong>{state.favorites.length} <Heart size={14} fill={state.favorites.length ? "currentColor" : "none"} /></strong></Link><Link href="/adopciones" className="stat-card-link" title="Ver mis solicitudes"><span className="muted">Solicitudes</span><strong>{state.applications.length}</strong></Link></div><Link href="/favoritos" className="panel-nav-card" title="Ir a mis mascotas favoritas"><div className="row"><span className="brand-mark small text-honey"><Heart size={18} fill="currentColor" /></span><div><strong>Mascotas favoritas</strong><p className="muted" style={{ margin: 0, fontSize: "12px" }}>{state.favorites.length} {state.favorites.length === 1 ? "mascota guardada" : "mascotas guardadas"}</p></div></div><ArrowRight size={17} className="muted" /></Link><button className="button secondary" onClick={logout}>Cerrar sesión y cambiar de perfil</button></section><section className="panel stack"><div className="panel-head"><h2><Sparkles size={21} /> Match</h2><span className={`badge ${state.profile?.completed ? "green" : "amber"}`}>{state.profile?.completed ? "Test completo" : "Pendiente"}</span></div>{state.profile?.completed ? <><p>Tus recomendaciones están calculadas con las preferencias guardadas.</p><div className="summary-list"><p><strong>Hogar:</strong> {state.profile.housing === "casa" ? "Casa" : "Departamento"}{state.profile.yard ? " con patio" : " sin patio"}</p><p><strong>Ciudad:</strong> {state.profile.city}</p><p><strong>Actividad:</strong> {energyNames[state.profile.activity]}</p><p><strong>Preferencia:</strong> {state.profile.species === "cualquiera" ? "Abierto a conocer" : state.profile.species === "perro" ? "Perros" : "Gatos"}</p></div></> : <p>Completa tres pasos sobre tu hogar, tu rutina y tus preferencias para obtener recomendaciones explicadas.</p>}<Link href="/test" className="button primary">{state.profile?.completed ? "Editar mis respuestas" : "Completar mi test"}<ArrowRight size={17} /></Link><p className="helper">Puedes actualizar tu test cuando cambien tus circunstancias.</p></section></div></>;
}

export function Adopter({ path }: { path: string[] }) {
  if (!path.length || path[0] === "explorar") return <Explore />;
  if (path[0] === "favoritos") return <Explore initialFavorites={true} />;
  if (path[0] === "test") return <TestWizard />;
  if (path[0] === "mascotas" && path[1]) return <PetDetail id={path[1]} />;
  if (path[0] === "solicitud" && path[1]) return <AdoptionRequest petId={path[1]} />;
  if (path[0] === "match") return <Match />;
  if (path[0] === "adopciones") return <Applications />;
  if (path[0] === "perfil") return <Profile />;
  return <Empty title="Esta página no está disponible" description="Puedes continuar desde el catálogo de mascotas."><Link href="/explorar" className="button primary">Volver al inicio</Link></Empty>;
}
