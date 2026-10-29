"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { useApp } from "@/components/app-provider";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string;
  at: string;
}

export function NotificationMenu() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const storageKey = `patamatch-read-notifications-${state.user?.id ?? "anonymous"}`;

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      setReadIds(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : []);
    } catch { setReadIds([]); }
  }, [storageKey]);

  const markAsRead = (id?: string) => {
    let next: string[];
    if (id) {
      next = Array.from(new Set([...readIds, id]));
    } else {
      next = Array.from(new Set([...readIds, ...notifications.map(notification => notification.id)]));
    }
    setReadIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [open]);

  const role = state.user?.role;

  const notifications = useMemo(() => {
    if (!state.user) return [];
    const list: NotificationItem[] = [];

    if (role === "ADOPTANTE") {
      state.applications.forEach((app) => {
        const pet = state.pets.find((p) => p.id === app.petId);
        const petName = pet?.name ?? "tu mascota elegida";
        const latestEvent = app.events[app.events.length - 1];
        const eventAt = latestEvent?.at ?? app.createdAt;

        if (app.status === "entrevista") {
          list.push({
            id: `${app.id}-entrevista`,
            title: "📅 Entrevista agendada",
            message: `El refugio agendó fecha y hora para conocer a ${petName}.`,
            link: "/adopciones",
            at: eventAt,
          });
        } else if (app.status === "visita") {
          list.push({
            id: `${app.id}-visita`,
            title: "🏡 Visita programada",
            message: `Se programó un encuentro de convivencia para ${petName}.`,
            link: "/adopciones",
            at: eventAt,
          });
        } else if (app.status === "aprobada") {
          list.push({
            id: `${app.id}-aprobada`,
            title: "✨ ¡Solicitud pre-aprobada!",
            message: `Tu solicitud para adoptar a ${petName} fue validada con éxito.`,
            link: "/adopciones",
            at: eventAt,
          });
        } else if (app.status === "adoptada") {
          list.push({
            id: `${app.id}-adoptada`,
            title: "🎉 ¡Adopción completada!",
            message: `¡Final Feliz con ${petName}! Tu comprobante digital ya está listo.`,
            link: "/adopciones",
            at: eventAt,
          });
        } else if (app.status === "en_revision") {
          list.push({
            id: `${app.id}-en_revision`,
            title: "🔍 Solicitud en revisión",
            message: `El refugio está revisando tu perfil para ${petName}.`,
            link: "/adopciones",
            at: eventAt,
          });
        } else if (app.status === "rechazada") {
          list.push({
            id: `${app.id}-rechazada`,
            title: "Actualización de solicitud",
            message: `El proceso de adopción de ${petName} concluyó.`,
            link: "/adopciones",
            at: eventAt,
          });
        }
      });
    } else if (role === "REFUGIO") {
      const ownPetIds = new Set(state.pets.filter((p) => p.shelterId === state.user?.id).map((p) => p.id));
      state.applications
        .filter((app) => ownPetIds.has(app.petId))
        .forEach((app) => {
          const pet = state.pets.find((p) => p.id === app.petId);
          const petName = pet?.name ?? "mascota";
          const latestEvent = app.events[app.events.length - 1];
          const eventAt = latestEvent?.at ?? app.createdAt;

          if (app.status === "enviada") {
            list.push({
              id: `${app.id}-recibida`,
              title: "📥 Nueva solicitud recibida",
              message: `${app.adopterName} envió una solicitud para adoptar a ${petName}.`,
              link: "/refugio/solicitudes",
              at: app.createdAt,
            });
          } else if (app.status === "cancelada") {
            list.push({
              id: `${app.id}-cancelada`,
              title: "Solicitud cancelada",
              message: `${app.adopterName} canceló su trámite por ${petName}.`,
              link: "/refugio/solicitudes",
              at: eventAt,
            });
          }
        });
    }

    if (role === "REFUGIO" || role === "VETERINARIO") {
      for (const collaboration of state.collaborations) {
        if (role === "VETERINARIO" && collaboration.status === "PENDING") {
          list.push({ id: `${collaboration.id}-${collaboration.updatedAt}`, title: "Solicitud de colaboración", message: `${collaboration.shelterName} quiere colaborar contigo.`, link: "/veterinario/refugios", at: collaboration.updatedAt });
        } else if (role === "REFUGIO" && collaboration.status !== "PENDING") {
          const status = { ACCEPTED: "aceptó la colaboración", REJECTED: "rechazó la solicitud", CANCELLED: "tiene una solicitud cancelada", ENDED: "tiene una colaboración finalizada" }[collaboration.status];
          list.push({ id: `${collaboration.id}-${collaboration.updatedAt}`, title: "Equipo veterinario", message: `${collaboration.veterinarianName}: ${status}.`, link: "/refugio/veterinarios", at: collaboration.updatedAt });
        }
      }
    }
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [state.user, state.applications, state.pets, state.collaborations, role]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const formatDateShort = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="notification-menu-wrap" ref={menuRef} style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        className="button icon ghost notification-bell-btn"
        aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="notification-dropdown" aria-label="Notificaciones recientes">
          <div className="row between" style={{ paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
            <div className="row" style={{ gap: "6px", alignItems: "center" }}>
              <strong style={{ fontSize: "0.95rem" }}>Notificaciones</strong>
              {unreadCount > 0 && <span className="badge green small">{unreadCount} nuevas</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-link"
                style={{ fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "var(--forest)" }}
                onClick={() => markAsRead()}
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="stack" style={{ maxHeight: "360px", overflowY: "auto", gap: "6px", marginTop: "4px" }}>
            {notifications.length ? (
              notifications.map((n) => {
                const isUnread = !readIds.includes(n.id);
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    className={`notification-item ${isUnread ? "unread" : ""}`}
                    onClick={() => {
                      markAsRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <strong>
                      <span>{n.title}</span>
                      {isUnread && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--forest)", display: "inline-block" }} />}
                    </strong>
                    <p>{n.message}</p>
                    <small>{formatDateShort(n.at)}</small>
                  </Link>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "24px 10px", color: "var(--muted)" }}>
                <Inbox size={28} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: "0.85rem" }}>No tienes notificaciones pendientes.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
