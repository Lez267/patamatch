"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "motion/react";
import { Sparkles, Heart, Pause, Play, Eye, Hand, Volume2, VolumeX } from "lucide-react";
import styles from "./cat-mascot.module.css";

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

export function CatMascot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isNear, setIsNear] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSquinting, setIsSquinting] = useState(false);
  const [isBooping, setIsBooping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [particles, setParticles] = useState<SparkleParticle[]>([]);
  const [statusMessage, setStatusMessage] = useState("Acerca tu cursor · Miso tiene curiosidad");
  const particleIdRef = useRef(0);

  // Raw mouse coordinates normalized from -1 to 1
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const mouseRawX = useMotionValue(0);
  const mouseRawY = useMotionValue(0);

  // Damped spring physics for organic feline motion
  const springConfig = { stiffness: 140, damping: 16, mass: 0.8 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Head and body tracking transforms
  const headRotate = useTransform(smoothX, [-1, 1], [-14, 14]);
  const headTranslateX = useTransform(smoothX, [-1, 1], [-22, 22]);
  const headTranslateY = useTransform(smoothY, [-1, 1], [-16, 18]);
  const bodyTilt = useTransform(smoothX, [-1, 1], [-5, 5]);

  // Eye gaze tracking (constrained to eye socket)
  const eyeX = useTransform(smoothX, [-1, 1], [-11, 11]);
  const eyeY = useTransform(smoothY, [-1, 1], [-7, 9]);
  const specularX = useTransform(smoothX, [-1, 1], [-4, 4]);
  const specularY = useTransform(smoothY, [-1, 1], [-3, 3]);

  // Ear micro-flex
  const leftEarRotate = useTransform(smoothX, [-1, 1], [-8, 4]);
  const rightEarRotate = useTransform(smoothX, [-1, 1], [-4, 8]);

  // Paw spring physics (quicker, slightly playful response)
  const pawSpringConfig = { stiffness: 180, damping: 14, mass: 0.6 };
  const pawTargetX = useMotionValue(0);
  const pawTargetY = useMotionValue(0);
  const pawSmoothX = useSpring(pawTargetX, pawSpringConfig);
  const pawSmoothY = useSpring(pawTargetY, pawSpringConfig);
  const pawRotate = useTransform(pawSmoothX, [-100, 100], [-25, 25]);
  const pawPadOpacity = useTransform(pawSmoothY, [0, -25], [0, 1]);
  const restingClawOpacity = useTransform(pawSmoothY, [0, -25], [1, 0]);

  // Natural blinking timer
  useEffect(() => {
    if (paused) return;
    let timeout: NodeJS.Timeout;
    const scheduleBlink = () => {
      const nextBlink = Math.random() * 3200 + 2600;
      timeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, nextBlink);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, [paused]);

  // Dynamic Paw reaching behavior
  const triggerPawReach = useCallback((targetX: number, targetY: number) => {
    pawTargetX.set(targetX);
    pawTargetY.set(targetY);
  }, [pawTargetX, pawTargetY]);

  // Periodic spontaneous playful paw lift (even without moving mouse much)
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      // If not currently hovering, occasionally do a gentle curiosity paw lift
      if (!isHovered) {
        setStatusMessage("🐾 Miso alza su patita hacia ti…");
        pawTargetY.set(-75);
        pawTargetX.set(15);
        setTimeout(() => {
          if (!isHovered) {
            pawTargetY.set(0);
            pawTargetX.set(0);
            setStatusMessage("Acerca tu cursor · Miso tiene curiosidad");
          }
        }, 1800);
      }
    }, 9000);
    return () => clearInterval(interval);
  }, [paused, isHovered, pawTargetX, pawTargetY]);

  // Mouse move handler
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (paused) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Normalized coordinates (-1 to 1)
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relY = (e.clientY - (rect.top + rect.height * 0.45)) / (rect.height / 2);

    const clampedX = Math.max(-1.1, Math.min(1.1, relX));
    const clampedY = Math.max(-1.1, Math.min(1.1, relY));

    mouseX.set(clampedX);
    mouseY.set(clampedY);
    mouseRawX.set(e.clientX - rect.left);
    mouseRawY.set(e.clientY - rect.top);

    // Distance calculation
    const dist = Math.hypot(relX, relY);
    const near = dist < 1.05;
    setIsNear(near);

    // Dynamic Paw reaching behavior: Lifts paw off the floor towards cursor
    if (near || isHovered) {
      // Paw lifts from ground level (0) up to -140px depending on mouse Y position
      const reachX = clampedX * 65 + 15;
      const reachY = Math.min(-30, clampedY * 80 - 85);
      pawTargetX.set(reachX);
      pawTargetY.set(reachY);
      setStatusMessage("🐾 Miso extiende su patita hacia ti");
    } else {
      pawTargetX.set(0);
      pawTargetY.set(0);
      setStatusMessage("👀 Siguiendo tu cursor con curiosidad");
    }

    // Happy squint if close to Miso's face
    const distToFace = Math.hypot(relX, relY + 0.1);
    if (distToFace < 0.38) {
      setIsSquinting(true);
      setStatusMessage("💛 Ronroneando suavemente…");
    } else {
      setIsSquinting(false);
    }
  }, [paused, isHovered, mouseX, mouseY, mouseRawX, mouseRawY, pawTargetX, pawTargetY]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setIsNear(false);
    setIsSquinting(false);
    mouseX.set(0);
    mouseY.set(0);
    pawTargetX.set(0);
    pawTargetY.set(0);
    setStatusMessage("Acerca tu cursor · Miso tiene curiosidad");
  }, [mouseX, mouseY, pawTargetX, pawTargetY]);

  // Click / Boop action
  const handleInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (paused) return;
    setIsBooping(true);
    setStatusMessage("✨ ¡Miso chocó patitas contigo!");

    // Spawn burst of subtle golden sparkles
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const newParticles: SparkleParticle[] = Array.from({ length: 6 }).map((_, i) => ({
        id: ++particleIdRef.current,
        x: clickX + (Math.random() - 0.5) * 40,
        y: clickY + (Math.random() - 0.5) * 40,
        size: Math.random() * 8 + 6,
        color: i % 2 === 0 ? "#F8D179" : "#FFF1D0",
      }));
      setParticles((prev) => [...prev.slice(-12), ...newParticles]);
    }

    setTimeout(() => {
      setIsBooping(false);
    }, 380);
  }, [paused]);

  // Clean up particles
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => {
      setParticles([]);
    }, 900);
    return () => clearTimeout(timer);
  }, [particles]);

  return (
    <div
      ref={containerRef}
      className={styles.mascotContainer}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleInteraction}
      data-miso-viewport
      tabIndex={0}
      role="region"
      aria-label="Mascota interactiva Miso: sigue tu cursor y alza su patita"
    >
      {/* Outer ambient glow and background depth */}
      <div className={styles.ambientGlow} aria-hidden="true" />

      {/* Floating dust motes / light embers */}
      <div className={styles.particlesLayer} aria-hidden="true">
        <span className={`${styles.mote} ${styles.mote1}`} />
        <span className={`${styles.mote} ${styles.mote2}`} />
        <span className={`${styles.mote} ${styles.mote3}`} />
        <span className={`${styles.mote} ${styles.mote4}`} />
      </div>

      {/* Header identity inside the card */}
      <div className={styles.metaHeader}>
        <div>
          <span className={styles.metaEyebrow}>EMBAJADOR PATAMATCH</span>
          <div className={styles.metaTitle}>
            <h3>Miso</h3>
            <span className={styles.badgeBreed}>Mestizo · 6 meses</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.pauseToggle}
          onClick={(e) => {
            e.stopPropagation();
            setPaused(!paused);
          }}
          aria-label={paused ? "Reanudar interacción con Miso" : "Pausar interacción"}
          title={paused ? "Reanudar" : "Pausar"}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>

      {/* Stage with character */}
      <div className={styles.stage}>
        {/* Soft ground shadow that reacts to breathing */}
        <motion.div
          className={styles.groundShadow}
          animate={{
            scaleX: [1, 1.05, 1],
            opacity: [0.35, 0.42, 0.35],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        />

        {/* Feline Character SVG Component */}
        <motion.div
          className={styles.catActor}
          style={{
            rotate: bodyTilt,
          }}
          animate={paused ? {} : {
            y: [0, -4, 0],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            viewBox="0 0 380 440"
            className={styles.catSvg}
            aria-hidden="true"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Fur & Amber Gradients */}
              <linearGradient id="amberPatchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E28929" />
                <stop offset="60%" stopColor="#C97018" />
                <stop offset="100%" stopColor="#A8570A" />
              </linearGradient>

              <linearGradient id="furCreamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FAF7F0" />
                <stop offset="55%" stopColor="#F3EDE0" />
                <stop offset="100%" stopColor="#E5DCBA" />
              </linearGradient>

              <radialGradient id="eyeAmberGrad" cx="45%" cy="40%" r="55%">
                <stop offset="0%" stopColor="#FCD36E" />
                <stop offset="45%" stopColor="#E5992B" />
                <stop offset="85%" stopColor="#B3650E" />
                <stop offset="100%" stopColor="#7A3D00" />
              </radialGradient>

              <linearGradient id="earInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F9B8B8" />
                <stop offset="100%" stopColor="#ECA0A0" />
              </linearGradient>

              <filter id="softGazeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* --- TAIL (Curling with smooth organic wave) --- */}
            <motion.path
              d="M 120 370 C 80 370 50 330 65 290 C 75 260 100 250 95 230 C 90 215 75 220 70 235"
              stroke="#D2771E"
              strokeWidth="24"
              strokeLinecap="round"
              fill="none"
              animate={paused ? {} : {
                d: [
                  "M 120 370 C 80 370 50 330 65 290 C 75 260 100 250 95 230 C 90 215 75 220 70 235",
                  "M 120 370 C 75 375 42 320 60 280 C 72 250 85 235 80 215 C 75 200 62 210 58 225",
                  "M 120 370 C 80 370 50 330 65 290 C 75 260 100 250 95 230 C 90 215 75 220 70 235",
                ],
              }}
              transition={{
                duration: 4.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* --- BODY & HIPS --- */}
            <g id="bodyGroup">
              {/* Back silhouette */}
              <ellipse cx="190" cy="335" rx="88" ry="78" fill="url(#furCreamGrad)" />
              {/* Right ginger flank patch */}
              <path
                d="M 230 285 C 265 295 285 340 265 375 C 245 400 210 405 190 405 C 230 400 260 360 250 320 Z"
                fill="url(#amberPatchGrad)"
                opacity="0.95"
              />
              {/* Left hip shadow */}
              <path
                d="M 130 330 C 110 350 115 390 145 405 C 120 395 108 360 120 330 Z"
                fill="#D8CEBA"
                opacity="0.4"
              />

              {/* Chest bib (Warm Cream White) */}
              <path
                d="M 155 240 C 175 245 205 245 225 240 C 240 280 235 340 220 380 C 195 390 185 390 160 380 C 145 340 140 280 155 240 Z"
                fill="#FCF9F2"
              />

              {/* Rear sitting paws */}
              <ellipse cx="125" cy="395" rx="26" ry="17" fill="#F3EDE0" />
              <ellipse cx="255" cy="395" rx="26" ry="17" fill="#F3EDE0" />
              {/* Left resting front leg */}
              <rect x="145" y="300" width="34" height="95" rx="17" fill="#F7F3EA" />
              <ellipse cx="162" cy="398" rx="19" ry="13" fill="#FFFDF8" />
              <line x1="156" y1="394" x2="156" y2="406" stroke="#E2DAC9" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="168" y1="394" x2="168" y2="406" stroke="#E2DAC9" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* --- HEAD & FACE (Anchored & Rotates with Spring) --- */}
            <motion.g
              id="headGroup"
              style={{
                originX: "190px",
                originY: "210px",
                rotate: headRotate,
                x: headTranslateX,
                y: headTranslateY,
              }}
            >
              {/* --- EARS --- */}
              {/* Left Ear */}
              <motion.g style={{ originX: "135px", originY: "125px", rotate: leftEarRotate }}>
                <path
                  d="M 115 145 C 105 105 125 55 145 60 C 160 65 172 105 168 135 Z"
                  fill="#E28929"
                />
                <path
                  d="M 125 135 C 120 105 132 75 144 78 C 153 82 158 108 155 128 Z"
                  fill="url(#earInnerGrad)"
                />
                {/* Ear tuft fluff */}
                <path d="M 130 135 C 138 125 142 128 148 138" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
              </motion.g>

              {/* Right Ear */}
              <motion.g style={{ originX: "245px", originY: "125px", rotate: rightEarRotate }}>
                <path
                  d="M 265 145 C 275 105 255 55 235 60 C 220 65 208 105 212 135 Z"
                  fill="#FAF7F0"
                />
                <path
                  d="M 255 135 C 260 105 248 75 236 78 C 227 82 222 108 225 128 Z"
                  fill="url(#earInnerGrad)"
                />
                {/* Ear tuft fluff */}
                <path d="M 250 135 C 242 125 238 128 232 138" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
              </motion.g>

              {/* --- HEAD BASE --- */}
              <ellipse cx="190" cy="165" rx="84" ry="72" fill="url(#furCreamGrad)" />

              {/* Ginger Calico / Tuxedo Mask over Left Eye & Forehead */}
              <path
                d="M 115 145 C 110 170 120 205 155 210 C 175 212 185 190 185 155 C 185 110 150 95 135 110 Z"
                fill="url(#amberPatchGrad)"
              />
              <path
                d="M 190 95 C 170 95 155 115 155 135 C 165 128 180 125 190 125 C 200 125 215 128 225 135 C 225 115 210 95 190 95 Z"
                fill="url(#amberPatchGrad)"
                opacity="0.85"
              />

              {/* --- EYES (Dynamic Gaze Following) --- */}
              {/* Left Eye Socket */}
              <g id="leftEye">
                <ellipse cx="152" cy="162" rx="20" ry="22" fill="#FFFFFF" stroke="#E8DFD0" strokeWidth="1.5" />
                <clipPath id="leftEyeClip">
                  <ellipse cx="152" cy="162" rx="20" ry="22" />
                </clipPath>
                <g clipPath="url(#leftEyeClip)">
                  {/* Eye content group moving with cursor gaze */}
                  <motion.g style={{ x: eyeX, y: eyeY }}>
                    {/* Amber Iris */}
                    <circle cx="152" cy="162" r="15" fill="url(#eyeAmberGrad)" />
                    {/* Dark Pupil */}
                    <ellipse cx="152" cy="162" rx={isSquinting ? 3.5 : 7} ry={isSquinting ? 8 : 13} fill="#141414" />
                    {/* Specular Light Catches */}
                    <circle cx="147" cy="155" r="4.5" fill="#FFFFFF" />
                    <circle cx="157" cy="167" r="2.2" fill="#FFFFFF" opacity="0.85" />
                  </motion.g>

                  {/* Eyelid (Blink & Squint) */}
                  <motion.rect
                    x="130"
                    y="138"
                    width="44"
                    height="50"
                    rx="12"
                    fill="#C97018"
                    style={{ originY: "140px" }}
                    animate={{ scaleY: isBlinking ? 1 : isSquinting ? 0.55 : 0 }}
                    transition={{ duration: isBlinking ? 0.08 : 0.22, ease: "easeInOut" }}
                  />
                </g>
              </g>

              {/* Right Eye Socket */}
              <g id="rightEye">
                <ellipse cx="228" cy="162" rx="20" ry="22" fill="#FFFFFF" stroke="#E8DFD0" strokeWidth="1.5" />
                <clipPath id="rightEyeClip">
                  <ellipse cx="228" cy="162" rx="20" ry="22" />
                </clipPath>
                <g clipPath="url(#rightEyeClip)">
                  {/* Eye content group moving with cursor gaze */}
                  <motion.g style={{ x: eyeX, y: eyeY }}>
                    {/* Amber Iris */}
                    <circle cx="228" cy="162" r="15" fill="url(#eyeAmberGrad)" />
                    {/* Dark Pupil */}
                    <ellipse cx="228" cy="162" rx={isSquinting ? 3.5 : 7} ry={isSquinting ? 8 : 13} fill="#141414" />
                    {/* Specular Light Catches */}
                    <circle cx="223" cy="155" r="4.5" fill="#FFFFFF" />
                    <circle cx="233" cy="167" r="2.2" fill="#FFFFFF" opacity="0.85" />
                  </motion.g>

                  {/* Eyelid (Blink & Squint) */}
                  <motion.rect
                    x="206"
                    y="138"
                    width="44"
                    height="50"
                    rx="12"
                    fill="#F3EBDD"
                    style={{ originY: "140px" }}
                    animate={{ scaleY: isBlinking ? 1 : isSquinting ? 0.55 : 0 }}
                    transition={{ duration: isBlinking ? 0.08 : 0.22, ease: "easeInOut" }}
                  />
                </g>
              </g>

              {/* --- SNOUT & NOSE --- */}
              {/* White muzzle cheeks */}
              <ellipse cx="178" cy="192" rx="18" ry="13" fill="#FFFFFF" />
              <ellipse cx="202" cy="192" rx="18" ry="13" fill="#FFFFFF" />
              {/* Cute heart-rounded pink nose */}
              <path
                d="M 183 182 C 183 180 187 178 190 180 C 193 178 197 180 197 182 C 197 187 190 191 190 191 C 190 191 183 187 183 182 Z"
                fill="#F29A9A"
              />
              {/* Mouth line */}
              <path
                d="M 190 191 L 190 196 M 190 196 C 185 201 176 198 174 195 M 190 196 C 195 201 204 198 206 195"
                stroke="#C4AFA0"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* --- WHISKERS (Organic flex) --- */}
              <g id="whiskers" stroke="#EDE4D4" strokeWidth="2" strokeLinecap="round" opacity="0.85">
                {/* Left whiskers */}
                <path d="M 165 190 C 135 188 110 182 95 180" />
                <path d="M 165 194 C 135 197 110 196 92 200" />
                <path d="M 165 198 C 138 206 115 212 100 220" />
                {/* Right whiskers */}
                <path d="M 215 190 C 245 188 270 182 285 180" />
                <path d="M 215 194 C 245 197 270 196 288 200" />
                <path d="M 215 198 C 242 206 265 212 280 220" />
              </g>
            </motion.g>

            {/* --- ARTICULATED INTERACTIVE FRONT PAW --- */}
            {/* Smoothly lifts and reaches towards cursor when near */}
            <motion.g
              id="interactivePawGroup"
              style={{
                originX: "215px",
                originY: "300px",
                x: pawSmoothX,
                y: pawSmoothY,
                rotate: pawRotate,
                scale: isBooping ? 1.25 : 1,
              }}
              transition={{
                scale: { type: "spring", stiffness: 350, damping: 14 },
              }}
            >
              {/* Forearm (Tuxedo cream white) */}
              <rect
                x="200"
                y="300"
                width="34"
                height="95"
                rx="17"
                fill="#F7F3EA"
                stroke="#E2D9C5"
                strokeWidth="1.2"
              />
              {/* Paw Glove */}
              <ellipse cx="217" cy="396" rx="20" ry="15" fill="#FFFDF8" stroke="#E2D9C5" strokeWidth="1.5" />

              {/* Resting state: subtle toe lines on floor */}
              <motion.g style={{ opacity: restingClawOpacity }}>
                <line x1="211" y1="392" x2="211" y2="404" stroke="#E2DAC9" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="223" y1="392" x2="223" y2="404" stroke="#E2DAC9" strokeWidth="2.5" strokeLinecap="round" />
              </motion.g>

              {/* Raised state: Pink Paw Pads ("Frijolitos") reaching up */}
              <motion.g style={{ opacity: pawPadOpacity }}>
                {/* Main heart pad */}
                <path
                  d="M 213 397 C 213 392 216 389 218 391 C 220 389 223 392 223 397 C 223 401 218 404 218 404 C 218 404 213 401 213 397 Z"
                  fill="#F7AEB3"
                />
                {/* Toe beans */}
                <circle cx="207" cy="389" r="3.6" fill="#F7AEB3" />
                <circle cx="214" cy="384" r="3.8" fill="#F7AEB3" />
                <circle cx="222" cy="384" r="3.8" fill="#F7AEB3" />
                <circle cx="229" cy="389" r="3.6" fill="#F7AEB3" />
              </motion.g>
            </motion.g>
          </svg>
        </motion.div>

        {/* Burst particles when user clicks / boops */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className={styles.sparkle}
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
              }}
              initial={{ scale: 0, opacity: 1, y: 0 }}
              animate={{
                scale: [0, 1.4, 0],
                opacity: [1, 1, 0],
                y: -45,
                x: (Math.random() - 0.5) * 50,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Status Pill (Luxury Micro-Aesthetic) */}
      <div className={styles.statusPill}>
        <span className={styles.statusDot} data-active={isNear || isHovered} />
        <span className={styles.statusText}>{statusMessage}</span>
        <span className={styles.hintIcon}>
          {isNear ? <Hand size={13} className={styles.iconPaw} /> : <Eye size={13} />}
        </span>
      </div>

      {/* Footer hint */}
      <div className={styles.cardFooter}>
        <span>Toca la pantalla para chocar patitas con Miso</span>
      </div>
    </div>
  );
}
