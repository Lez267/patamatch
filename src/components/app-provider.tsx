"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createAuthClient } from "better-auth/react";
import type { AppState, Command } from "@/lib/types";

export const authClient = createAuthClient();
const emptyState: AppState = { user: null, pets: [], profile: null, favorites: [], applications: [], medicalRecords: [], users: [], reports: [], veterinaryProfile: null, veterinarians: [], collaborations: [], auditEvents: [] };
type AppContext = {
  state: AppState;
  loading: boolean;
  mutate: (command: Command) => Promise<boolean>;
  refresh: () => Promise<void>;
  toast: (message: string) => void;
  logout: () => Promise<void>;
};
const Context = createContext<AppContext | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("No pudimos cargar tus datos. Comprueba que el servidor esté activo.");
    setState(await response.json());
  }, []);
  useEffect(() => { refresh().catch(error => setMessage(error.message)).finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    const onFocus = () => { refresh().catch(error => setMessage(error.message)); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(timer);
  }, [message]);
  const mutate = useCallback(async (command: Command) => {
    try {
      const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el cambio.");
      await refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo conectar con el servidor.");
      return false;
    }
  }, [refresh]);
  async function logout() {
    await authClient.signOut();
    setState(emptyState);
    window.location.assign("/");
  }
  return <Context.Provider value={{ state, loading, mutate, refresh, toast: setMessage, logout }}>
    {children}
    {message && <div className="toast" role="status"><span>{message}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setMessage("")}>×</button></div>}
  </Context.Provider>;
}

export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("La aplicación necesita AppProvider.");
  return context;
}
