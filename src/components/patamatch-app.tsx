"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, ClipboardList, Heart, Home, KeyRound, LayoutDashboard, LoaderCircle, LogIn, LogOut, PawPrint, Plus, Search, Settings2, ShieldCheck, Sparkles, Stethoscope, UserRound, UsersRound } from "lucide-react";
import { authClient, useApp } from "@/components/app-provider";
import { Adopter } from "@/components/adopter";
import { NotificationMenu } from "@/components/notifications-menu";
import { Workspace } from "@/components/dashboards";
import { Landing } from "@/components/landing";
import type { Role } from "@/lib/types";
import { getPasswordValidationError, validatePasswordSecurity } from "@/lib/password-policy";

const homes: Record<Role, string> = { ADOPTANTE: "/explorar", REFUGIO: "/refugio", VETERINARIO: "/veterinario", ADMIN: "/admin" };
const roleNames: Record<Role, string> = { ADOPTANTE: "Adoptante", REFUGIO: "Refugio", VETERINARIO: "Veterinario", ADMIN: "Administrador" };
const demoEmails: Record<Role, string> = { ADOPTANTE: "adoptante@patamatch.local", REFUGIO: "refugio@patamatch.local", VETERINARIO: "veterinario@patamatch.local", ADMIN: "admin@patamatch.local" };
const navigation = {
  ADOPTANTE: [
    { href: "/explorar", label: "Explorar mascotas", icon: Search },
    { href: "/match", label: "Match", icon: Sparkles },
    { href: "/adopciones", label: "Mis adopciones", icon: Heart },
    { href: "/perfil", label: "Mi perfil", icon: UserRound },
  ],
  REFUGIO: [
    { href: "/refugio", label: "Resumen", icon: LayoutDashboard },
    { href: "/refugio/mascotas", label: "Mis mascotas", icon: PawPrint },
    { href: "/refugio/solicitudes", label: "Solicitudes", icon: ClipboardList },
    { href: "/refugio/entrevistas", label: "Entrevistas y visitas", icon: CalendarDays },
  ],
  VETERINARIO: [
    { href: "/veterinario", label: "Resumen", icon: LayoutDashboard },
    { href: "/veterinario/expedientes", label: "Expedientes", icon: Stethoscope },
    { href: "/veterinario/agenda", label: "Próximos cuidados", icon: CalendarDays },
  ],
  ADMIN: [
    { href: "/admin", label: "Resumen", icon: LayoutDashboard },
    { href: "/admin/usuarios", label: "Usuarios", icon: UsersRound },
    { href: "/admin/mascotas", label: "Mascotas", icon: PawPrint },
    { href: "/admin/reportes", label: "Moderación", icon: ShieldCheck },
  ],
};

function Login() {
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_ACCESS !== "false";
  const { refresh } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"demo" | "register" | "login">(demoEnabled ? "demo" : "login");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const pwdCheck = validatePasswordSecurity(password);

  async function signIn(selectedEmail: string, selectedPassword: string, role?: Role) {
    setBusy(role ?? "credentials");
    setError("");
    try {
      const result = await authClient.signIn.email({ email: selectedEmail, password: selectedPassword });
      if (result.error) throw new Error("No pudimos iniciar sesión. Revisa tu correo y contraseña.");
      await refresh();
      router.replace(role ? homes[role] : "/");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No hay conexión con el servidor."); }
    finally { setBusy(null); }
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Por favor escribe tu nombre completo.");
      return;
    }
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setBusy("register");
    setError("");
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "No se pudo crear la cuenta. Revisa que el correo sea válido o no esté registrado previamente.");
      }
      await refresh();
      router.replace("/test");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No hay conexión con el servidor.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Landing>
      <section className="login-card">
        <div className="segmented-control login-tabs" role="group" aria-label="Opciones de acceso" style={{ marginBottom: "22px", gridTemplateColumns: demoEnabled ? undefined : "repeat(2, minmax(0, 1fr))" }}>
          {demoEnabled && <button
            type="button"
            aria-pressed={mode === "demo"}
            className={`segment-btn ${mode === "demo" ? "active" : ""}`}
            onClick={() => { setMode("demo"); setError(""); }}
          >
            <Sparkles size={15} /> Demo (1 clic)
          </button>}
          <button
            type="button"
            aria-pressed={mode === "register"}
            className={`segment-btn ${mode === "register" ? "active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            <UserRound size={15} /> Crear cuenta
          </button>
          <button
            type="button"
            aria-pressed={mode === "login"}
            className={`segment-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            <LogIn size={15} /> Entrar
          </button>
        </div>

        {demoEnabled && mode === "demo" && (
          <>
            <div className="row between" style={{ alignItems: "center", marginBottom: "8px" }}>
              <span className="badge green"><span className="status-dot" /> Evaluación docente</span>
            </div>
            <h2>Bienvenido a PataMatch</h2>
            <p className="muted">Elige un perfil para recorrer la aplicación. Los cambios se guardan y se reflejan entre los paneles.</p>
            <div className="role-grid">
              {([
                ["ADOPTANTE", Heart, "Quiero adoptar", "Encuentra tu compañero"],
                ["REFUGIO", Home, "Soy un refugio", "Gestiona mascotas y solicitudes"],
                ["VETERINARIO", Stethoscope, "Soy veterinario", "Acompaña su salud"],
                ["ADMIN", ShieldCheck, "Administración", "Supervisa la comunidad"],
              ] as const).map(([role, Icon, title, description]) => (
                <button
                  key={role}
                  className="role-card"
                  disabled={!!busy}
                  onClick={() => signIn(demoEmails[role], "PataMatch2026!", role)}
                >
                  <Icon size={25} />
                  <strong>{title}</strong>
                  <span>{description}</span>
                  {busy === role && <LoaderCircle className="spin" size={18} />}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <span className="badge green"><Sparkles size={13} /> Registro de Adoptante</span>
            <h2>Crea tu cuenta</h2>
            <p className="muted">Regístrate para realizar tu test de estilo de vida y calcular tu match real con las mascotas.</p>
            <form className="stack" onSubmit={signUp}>
              <label className="field">
                Nombre completo
                <input
                  className="input"
                  required
                  maxLength={80}
                  placeholder="Ej. Jorge Morales"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="field">
                Correo electrónico
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="tu-correo@ejemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="field">
                Contraseña
                <input
                  className="input"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  placeholder="Mínimo 10 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {password.length > 0 && (
                  <div className="password-checklist" style={{ fontSize: "0.78rem", marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px", padding: "10px 14px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border)" }}>
                    <span style={{ color: pwdCheck.minLength ? "var(--forest-dk)" : "var(--muted)", fontWeight: pwdCheck.minLength ? 700 : 400 }}>
                      {pwdCheck.minLength ? "✓" : "○"} Mínimo 10 caracteres
                    </span>
                    <span style={{ color: (pwdCheck.hasUpper && pwdCheck.hasLower) ? "var(--forest-dk)" : "var(--muted)", fontWeight: (pwdCheck.hasUpper && pwdCheck.hasLower) ? 700 : 400 }}>
                      {(pwdCheck.hasUpper && pwdCheck.hasLower) ? "✓" : "○"} Letras mayúsculas y minúsculas
                    </span>
                    <span style={{ color: (pwdCheck.hasNumber && pwdCheck.hasSymbol) ? "var(--forest-dk)" : "var(--muted)", fontWeight: (pwdCheck.hasNumber && pwdCheck.hasSymbol) ? 700 : 400 }}>
                      {(pwdCheck.hasNumber && pwdCheck.hasSymbol) ? "✓" : "○"} Al menos un número y un símbolo especial (!@#$…)
                    </span>
                    <span style={{ color: pwdCheck.noSequential ? "var(--forest-dk)" : "#a1443c", fontWeight: pwdCheck.noSequential ? 700 : 600 }}>
                      {pwdCheck.noSequential ? "✓" : "✕"} Sin números consecutivos (ej. 123, 987, 111)
                    </span>
                    <span style={{ color: pwdCheck.noBirthYear ? "var(--forest-dk)" : "#a1443c", fontWeight: pwdCheck.noBirthYear ? 700 : 600 }}>
                      {pwdCheck.noBirthYear ? "✓" : "✕"} Sin fechas o años de nacimiento (ej. 1998, 2004)
                    </span>
                  </div>
                )}
              </label>
              <button className="button primary full" disabled={!!busy}>
                {busy === "register" ? <><LoaderCircle className="spin" size={18} /> Creando tu cuenta…</> : <>Crear cuenta y hacer mi test <ArrowRight size={18} /></>}
              </button>
            </form>
          </>
        )}

        {mode === "login" && (
          <>
            <span className="badge subtle"><ShieldCheck size={13} /> Acceso registrado</span>
            <h2>Iniciar sesión</h2>
            <p className="muted">Ingresa con tu correo y contraseña registrados para continuar tu proceso.</p>
            <form className="stack" onSubmit={(e) => { e.preventDefault(); signIn(email, password); }}>
              <label className="field">
                Correo electrónico
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="tu-correo@ejemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="field">
                Contraseña
                <input
                  className="input"
                  type="password"
                  minLength={8}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="button primary full" disabled={!!busy}>
                {busy === "credentials" ? <><LoaderCircle className="spin" size={18} /> Entrando…</> : <>Iniciar sesión <ArrowRight size={18} /></>}
              </button>
            </form>
          </>
        )}

        {error && <p className="error" role="alert" style={{ marginTop: "14px" }}>{error}</p>}
        <p className="helper" style={{ marginTop: "16px" }}><ShieldCheck size={16} /> Cuentas y datos guardados de forma segura en PostgreSQL local.</p>
      </section>
    </Landing>
  );
}

export function PataMatchApp({ path }: { path: string[] }) {
  const { state, loading, logout } = useApp();
  const router = useRouter();
  const role = state.user?.role;
  const currentPath = "/" + path.join("/");
  useEffect(() => {
    if (!loading && role && path.length === 0) {
      if (role === "ADOPTANTE" && !state.profile?.completed) {
        router.replace("/test");
      } else {
        router.replace(homes[role]);
      }
    }
  }, [loading, role, path.length, state.profile?.completed, router]);
  if (loading) return <div className="loading-screen"><PawPrint size={45} /><h1>PataMatch</h1><p>Preparando tu próxima historia…</p><LoaderCircle className="spin" /></div>;
  if (!state.user || !role) return <Login />;
  const links = navigation[role];
  const isAdopterPath = !["refugio", "veterinario", "admin"].includes(path[0]);
  const allowed = role === "ADOPTANTE" ? isAdopterPath : path[0] === homes[role].slice(1);
  const active = links.find(item => item.href === currentPath);
  const pending = state.applications.filter(item => !["rechazada", "adoptada", "cancelada"].includes(item.status)).length;
  return <div className={`app-shell role-${role.toLowerCase()}`}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <aside className="app-sidebar">
      <Link className="sidebar-brand" href={homes[role]}><span className="brand-mark"><PawPrint size={26} /></span><span className="brand-wordmark">PataMatch<span>Un hogar, una nueva historia</span></span></Link>
      <div className="role-label">{roleNames[role]} <span className="status-dot" /></div>
      <nav className="sidebar-nav" aria-label="Navegación principal">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${href === currentPath ? "active" : ""}`} aria-current={href === currentPath ? "page" : undefined}><Icon size={20} /><span>{label}</span>{href.includes("solicitudes") && pending > 0 && <span className="nav-count">{pending}</span>}</Link>)}</nav>
      {role === "ADOPTANTE" ? <div className="sidebar-tip"><Sparkles size={23} /><strong>Una conexión a tu medida</strong><p>Cuéntanos cómo es tu día a día y descubre quién puede acompañarte.</p><Link href="/test" className="button secondary">{state.profile?.completed ? "Editar mi test" : "Hacer mi test"}<ArrowRight size={16} /></Link></div> : role === "REFUGIO" ? <Link className="button primary" href="/refugio/registro"><Plus size={19} /> Registrar mascota</Link> : null}
      <div className="sidebar-footer"><div className="row"><span className="avatar">{state.user.name.split(" ").map(word => word[0]).slice(0, 2).join("")}</span><div><strong>{state.user.name}</strong><span className="muted">{roleNames[role]}</span></div></div><button className="button ghost" onClick={logout}><LogOut size={17} /> Cambiar de perfil</button><small className="muted">Entorno local · Datos de demostración</small></div>
    </aside>
    <div className="app-content">
      <header className="app-header"><Link href={homes[role]} className="mobile-brand"><PawPrint size={25} /><strong>PataMatch</strong></Link><div className="desktop-breadcrumb">PataMatch <span>/</span> {active?.label ?? (path.includes("registro") ? "Registrar mascota" : roleNames[role])}</div><div className="header-actions"><span className="badge subtle">Demo local</span><NotificationMenu /><button className="avatar small" title="Cambiar de perfil" aria-label="Cerrar sesión y cambiar de perfil" onClick={logout}>{state.user.name[0]}</button></div></header>
      <main className="app-main" id="contenido">
        {allowed ? (role === "ADOPTANTE" ? <Adopter path={path} /> : <Workspace path={path} />) : <div className="empty-state"><ShieldCheck size={40} /><h1>Este espacio pertenece a otro perfil</h1><p>Tu cuenta tiene acceso al panel de {roleNames[role].toLowerCase()}.</p><Link className="button primary" href={homes[role]}>Ir a mi panel<ArrowRight size={18} /></Link></div>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Navegación móvil">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={href === currentPath ? "active" : ""} aria-current={href === currentPath ? "page" : undefined}><Icon size={21} /><span>{label === "Explorar mascotas" ? "Explorar" : label === "Match" || label === "Mi compatibilidad" ? "Match" : label === "Mis adopciones" ? "Adopciones" : label === "Mi perfil" ? "Perfil" : label === "Entrevistas y visitas" ? "Agenda" : label === "Próximos cuidados" ? "Cuidados" : label}</span></Link>)}</nav>
  </div>;
}
