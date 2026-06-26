"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import styles from "./agenda.module.css";
import type { AgendaEvent, AgendaTodo } from "./agendaEvents";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const TYPE_LABEL: Record<AgendaEvent["type"], string> = {
  relance: "Relance",
  depart: "Départ",
  review: "À valider"
};

function fmt(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildGrid(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setDate(1 - ((start.getDay() + 6) % 7)); // reculer jusqu'au lundi
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

export function AgendaCalendar({ events, todos }: { events: AgendaEvent[]; todos: AgendaTodo[] }) {
  const today = new Date();
  // Ouvre le calendrier sur le mois du prochain évènement (sinon le 1er, sinon le mois courant),
  // pour ne jamais tomber sur une grille vide quand les dates sont éloignées.
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    const todayKey = fmt(now);
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const target = sorted.find((event) => event.date >= todayKey) ?? sorted[0];
    const base = target ? new Date(`${target.date}T00:00:00`) : now;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor]);
  const todayKey = fmt(today);

  const upcoming = useMemo(() => {
    return events.filter((event) => event.date >= todayKey).slice(0, 8);
  }, [events, todayKey]);

  function shift(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
  }

  return (
    <main className={dashStyles.page}>
      <header className={dashStyles.header}>
        <div>
          <p className={dashStyles.eyebrow}>Agenda</p>
          <h1>Agenda automatisé</h1>
          <p>
            Alimenté automatiquement par les actions du système : relances planifiées, départs prévus et demandes à
            valider. Aucune saisie manuelle.
          </p>
        </div>
        <div className={dashStyles.headerActions}>
          <button type="button" className={dashStyles.secondary} onClick={goToday}>
            Aujourd&apos;hui
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.calendarCard}>
          <div className={styles.calHeader}>
            <button type="button" className={styles.navBtn} onClick={() => shift(-1)} aria-label="Mois précédent">
              <ChevronLeft size={18} />
            </button>
            <strong>
              {MONTHS[cursor.month]} {cursor.year}
            </strong>
            <button type="button" className={styles.navBtn} onClick={() => shift(1)} aria-label="Mois suivant">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className={styles.grid}>
            {grid.map((date) => {
              const key = fmt(date);
              const dayEvents = eventsByDay.get(key) ?? [];
              const outside = date.getMonth() !== cursor.month;

              return (
                <div
                  key={key}
                  className={styles.cell}
                  data-outside={outside ? "true" : undefined}
                  data-today={key === todayKey ? "true" : undefined}
                >
                  <span className={styles.dayNum}>{date.getDate()}</span>
                  <div className={styles.cellEvents}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <Link
                        key={event.id}
                        href={event.href}
                        className={styles.chip}
                        data-type={event.type}
                        title={`${TYPE_LABEL[event.type]} · ${event.subtitle ?? ""}`}
                      >
                        {event.subtitle ?? event.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 ? <span className={styles.more}>+{dayEvents.length - 3}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem} data-type="relance">
              Relance
            </span>
            <span className={styles.legendItem} data-type="depart">
              Départ
            </span>
            <span className={styles.legendItem} data-type="review">
              À valider
            </span>
          </div>
        </section>

        <aside className={styles.side}>
          <section className={styles.sideCard}>
            <h2>Prochains rendez-vous</h2>
            {upcoming.length === 0 ? (
              <p className={styles.empty}>Aucun évènement à venir.</p>
            ) : (
              <ul className={styles.eventList}>
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <Link href={event.href}>
                      <span className={styles.dot} data-type={event.type} aria-hidden="true" />
                      <span className={styles.eventMeta}>
                        <strong>{event.subtitle ?? event.title}</strong>
                        <small>
                          {TYPE_LABEL[event.type]} ·{" "}
                          {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(event.date))}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.sideCard}>
            <h2>À traiter</h2>
            {todos.length === 0 ? (
              <p className={styles.empty}>Rien à traiter, tout est à jour.</p>
            ) : (
              <ul className={styles.todoList}>
                {todos.map((todo) => (
                  <li key={todo.leadId}>
                    <Link href={todo.href}>
                      <strong>{todo.label}</strong>
                      <StatusBadge status={todo.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
