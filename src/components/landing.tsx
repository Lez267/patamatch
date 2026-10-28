"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Heart, House, Menu, Pause, PawPrint, Play, Sparkles, X } from "lucide-react";
import styles from "./landing.module.css";

export function Landing({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<"access" | "about" | "menu" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const motionEnabled = useRef(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel && !dialog.open) dialog.showModal();
    if (!panel && dialog.open) dialog.close();
    if (!panel) return;
    dialog.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [panel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (motionEnabled.current && !document.hidden && !dialogRef.current?.open) {
        void video.play().catch(() => setIsPlaying(false));
      } else {
        video.pause();
      }
    };
    const syncPreference = () => {
      motionEnabled.current = !preference.matches;
      syncPlayback();
    };
    syncPreference();
    preference.addEventListener("change", syncPreference);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      preference.removeEventListener("change", syncPreference);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (panel || !motionEnabled.current || document.hidden) video.pause();
    else void video.play().catch(() => setIsPlaying(false));
  }, [panel]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    motionEnabled.current = video.paused;
    if (video.paused) void video.play().catch(() => setIsPlaying(false));
    else video.pause();
  }

  return <>
    <div className={styles.page}>
      <a className="skip-link" href="#bienvenida">Saltar al contenido</a>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="PataMatch, inicio">
          <span className="brand-mark"><PawPrint size={26} /></span>
          <span className="brand-wordmark">PataMatch<span>Un hogar, una nueva historia</span></span>
        </a>
        <nav className={styles.navigation} aria-label="Navegación principal">
          <button type="button" onClick={() => setPanel("about")}>Cómo funciona</button>
          <button type="button" onClick={() => setPanel("access")}>Para refugios</button>
        </nav>
        <button type="button" className={`button secondary ${styles.access}`} onClick={() => setPanel("access")}>
          Entrar a PataMatch <ArrowRight size={17} />
        </button>
        <button type="button" className={styles.menuButton} onClick={() => setPanel("menu")} aria-label="Abrir menú">
          <Menu size={24} />
        </button>
      </header>

      <main className={styles.hero} id="bienvenida">
        <section className={styles.copy} aria-labelledby="welcome-title">
          <p className={styles.intro}><span aria-hidden="true"><PawPrint size={18} /></span>Una conexión a tu medida</p>
          <h1 id="welcome-title">Un hogar.<br />Una nueva<br />historia.</h1>
          <p className={styles.description}>
            Encuentra a ese compañero que encaja con tu vida. Su próxima historia puede empezar contigo.
          </p>
          <div className={styles.actions}>
            <button type="button" className={`button primary ${styles.primaryAction}`} onClick={() => setPanel("access")}>
              Encontrar mi compañero <ArrowRight size={19} />
            </button>
            <button type="button" className={styles.textAction} onClick={() => setPanel("about")}>Conoce el proceso</button>
          </div>
          <div className={styles.matchNote}>
            <span className={styles.matchIcon} aria-hidden="true"><Sparkles size={22} /></span>
            <p><strong>No es solo adoptar. Es hacer match.</strong><span>Tu hogar, tu rutina y sus necesidades importan.</span></p>
          </div>
        </section>

        <figure className={styles.portrait}>
          <div className={styles.portraitFrame}>
            <div className={styles.videoWindow}>
              <video
                ref={videoRef}
                className={styles.video}
                loop
                muted
                playsInline
                preload="metadata"
                poster="/videos/video-gato-poster.jpg"
                aria-label="Un gato curioso que espera su próxima historia"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => { setVideoUnavailable(true); setIsPlaying(false); }}
              >
                <source src="/videos/video-gato.mp4" type="video/mp4" onError={() => { setVideoUnavailable(true); setIsPlaying(false); }} />
              </video>
            </div>
          </div>
          <div className={styles.connectionSeal} aria-hidden="true"><Heart size={29} strokeWidth={1.6} /></div>
          <figcaption className={styles.portraitCaption}>
            <div><span>Un encuentro. Dos vidas.</span><strong>Mucho por vivir juntos.</strong></div>
            {!videoUnavailable && <button type="button" className={styles.playback} onClick={togglePlayback} aria-label={isPlaying ? "Pausar video del gato" : "Reproducir video del gato"}>
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>}
          </figcaption>
        </figure>
      </main>

      <section className={styles.journey} aria-label="Tu camino hacia la adopción">
        <div className={styles.journeyHeading}><span>Un nuevo comienzo,</span><strong>paso a paso.</strong></div>
        <ol className={styles.steps}>
          <li><span className={styles.stepIcon} aria-hidden="true"><PawPrint size={22} /></span><div><strong>Descubre</strong><span>Conoce a tu posible compañero.</span></div></li>
          <li><span className={styles.stepIcon} aria-hidden="true"><Heart size={22} /></span><div><strong>Conecta</strong><span>Da el siguiente paso con su refugio.</span></div></li>
          <li><span className={styles.stepIcon} aria-hidden="true"><House size={22} /></span><div><strong>Adopta</strong><span>Empiecen una vida juntos.</span></div></li>
        </ol>
      </section>

      <footer className={styles.footer}><span>Adopción responsable. Compañía para toda la vida.</span><span>Hecho para conectar vidas <PawPrint size={13} aria-hidden="true" /></span></footer>
    </div>

    <dialog ref={dialogRef} className={`${styles.dialog} ${panel === "menu" ? styles.mobileMenu : ""}`} onCancel={() => setPanel(null)} onClose={() => setPanel(null)} onClick={(event) => { if (event.target === event.currentTarget) setPanel(null); }} aria-label={panel === "access" ? "Acceso a PataMatch" : panel === "about" ? "Cómo funciona PataMatch" : "Menú principal"}>
      <div className={styles.dialogBody}>
        <button type="button" className={styles.close} onClick={() => setPanel(null)} aria-label="Cerrar"><X size={22} /></button>
        {panel === "access" && children}
        {panel === "about" && <div className={styles.about}><PawPrint size={32} /><h2>Una adopción,<br />paso a paso.</h2><p>Cada mascota tiene su historia. Cada persona, su forma de vivir. PataMatch te ayuda a encontrar una buena conexión.</p><ol><li><strong>Encuentra a tu compañero</strong><span>Explora las mascotas y completa tu perfil para conocer su compatibilidad contigo.</span></li><li><strong>Conecta con el refugio</strong><span>Envía tu solicitud y coordina una entrevista o una visita para conocerse.</span></li><li><strong>Comienza una nueva historia</strong><span>Acompaña el proceso de adopción y el seguimiento de su bienestar.</span></li></ol><button className="button primary" type="button" onClick={() => setPanel("access")}>Quiero empezar <ArrowRight size={18} /></button></div>}
        {panel === "menu" && <nav className={styles.menuLinks} aria-label="Navegación móvil"><span className={styles.menuBrand}><span className="brand-mark"><PawPrint size={26} /></span>PataMatch</span><button type="button" onClick={() => setPanel("about")}>Cómo funciona</button><button type="button" onClick={() => setPanel("access")}>Para refugios</button><button type="button" onClick={() => setPanel("access")}>Entrar <ArrowRight size={25} /></button></nav>}
      </div>
    </dialog>
  </>;
}
