"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import styles from "../app/home.module.css";

const optionLabels = ["Bagages", "PMR", "Wi-Fi", "Arrets multiples"];
const monthLabels = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];
const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];

type TripChoice = "one_way" | "round_trip";

type DatePickerFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
};

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const date = parseIsoDate(value);
  return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()}`;
}

function buildCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const offsetFromMonday = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - offsetFromMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      iso: toIsoDate(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function DatePickerField({ label, name, value, onChange }: DatePickerFieldProps) {
  const selectedDate = parseIsoDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState({
    month: selectedDate.getMonth(),
    year: selectedDate.getFullYear(),
  });
  const cells = buildCalendarCells(visibleMonth.year, visibleMonth.month);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + offset, 1);
      return { month: next.getMonth(), year: next.getFullYear() };
    });
  }

  function toggleCalendar() {
    setVisibleMonth({ month: selectedDate.getMonth(), year: selectedDate.getFullYear() });
    setIsOpen((current) => !current);
  }

  return (
    <div className={`${styles.field} ${styles.calendarField}`}>
      <span>{label}</span>
      <input name={name} type="hidden" value={value} />
      <button
        className={styles.dateDisplayButton}
        type="button"
        onClick={toggleCalendar}
        aria-expanded={isOpen}
      >
        <span>{formatDisplayDate(value)}</span>
        <CalendarDays aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
      {isOpen ? (
        <div
          className={styles.calendarPanel}
          role="dialog"
          aria-label={`Choisir ${label.toLowerCase()}`}
        >
          <div className={styles.calendarHeader}>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Mois precedent">
              &lt;
            </button>
            <strong>
              {monthLabels[visibleMonth.month]} {visibleMonth.year}
            </strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Mois suivant">
              &gt;
            </button>
          </div>
          <div className={styles.calendarWeekdays}>
            {dayLabels.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {cells.map((cell) => (
              <button
                className={[
                  styles.calendarDay,
                  cell.isCurrentMonth ? "" : styles.calendarDayMuted,
                  cell.iso === value ? styles.calendarDaySelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={cell.iso}
                type="button"
                onClick={() => {
                  onChange(cell.iso);
                  setIsOpen(false);
                }}
              >
                {cell.date.getDate()}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LandingQuoteForm() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripChoice>("round_trip");
  const [hasIntermediateStops, setHasIntermediateStops] = useState(false);
  const [intermediateStops, setIntermediateStops] = useState(["Dijon"]);
  const [departureDate, setDepartureDate] = useState("2026-07-12");
  const [returnDate, setReturnDate] = useState("2026-07-13");
  const [callbackWanted, setCallbackWanted] = useState<"yes" | "no">("yes");
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["PMR"]);

  function addIntermediateStop() {
    setHasIntermediateStops(true);
    setIntermediateStops((current) => [...current, ""]);
  }

  function toggleOption(option: string) {
    setSelectedOptions((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const stops = formData
      .getAll("intermediateStops")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const options = hasIntermediateStops ? [...selectedOptions, "Arrets multiples"] : selectedOptions;
    const params = new URLSearchParams({
      departure: String(formData.get("departure") ?? ""),
      arrival: String(formData.get("arrival") ?? ""),
      departureDate: String(formData.get("departureDate") ?? ""),
      returnDate: tripType === "round_trip" ? String(formData.get("returnDate") ?? "") : "",
      passengers: String(formData.get("passengers") ?? ""),
      tripType,
      intermediateStops: stops.join(","),
      callback: callbackWanted,
      options: [...new Set(options)].join(","),
    });

    router.push(`/client/demande?${params.toString()}`);
  }

  return (
    <form className={styles.quoteCard} aria-label="Definissez votre projet" onSubmit={handleSubmit}>
      <div className={styles.quoteHeader}>
        <div>
          <p>Devis gratuit</p>
          <h2>Definissez votre projet</h2>
        </div>
      </div>

      <div className={styles.tripTabs} aria-label="Type de trajet">
        <button
          className={tripType === "one_way" ? styles.tabActive : styles.tab}
          type="button"
          onClick={() => setTripType("one_way")}
          aria-pressed={tripType === "one_way"}
        >
          Aller simple
        </button>
        <button
          className={tripType === "round_trip" ? styles.tabActive : styles.tab}
          type="button"
          onClick={() => setTripType("round_trip")}
          aria-pressed={tripType === "round_trip"}
        >
          Aller-retour
        </button>
        <button
          className={hasIntermediateStops ? styles.multiButtonActive : styles.multiButton}
          type="button"
          onClick={() => setHasIntermediateStops((current) => !current)}
          aria-pressed={hasIntermediateStops}
        >
          Multi-destinations
        </button>
      </div>

      <div className={hasIntermediateStops ? styles.routeGridWithStops : styles.routeGrid}>
        <label className={styles.field}>
          Depart
          <input name="departure" defaultValue="Paris" />
        </label>

        {hasIntermediateStops ? (
          <div className={styles.intermediatePanel}>
            <div className={styles.intermediateHeader}>
              <span>Destination intermediaire</span>
              <button
                className={styles.addStopButton}
                type="button"
                onClick={addIntermediateStop}
                aria-label="Ajouter une destination intermediaire"
              >
                +
              </button>
            </div>
            {intermediateStops.map((defaultValue, index) => (
              <label className={styles.field} key={`stop-${index}`}>
                {index === 0 ? "Etape" : `Etape ${index + 1}`}
                <input name="intermediateStops" defaultValue={defaultValue} />
              </label>
            ))}
          </div>
        ) : null}

        <label className={styles.field}>
          Arrivee
          <input name="arrival" defaultValue="Lyon" />
        </label>
      </div>

      <div className={styles.dateGrid}>
        <div className={styles.dateStack}>
          <DatePickerField
            label="Date de depart"
            name="departureDate"
            value={departureDate}
            onChange={setDepartureDate}
          />
          {tripType === "round_trip" ? (
            <DatePickerField
              label="Date de retour"
              name="returnDate"
              value={returnDate}
              onChange={setReturnDate}
            />
          ) : null}
        </div>
        <label className={styles.field}>
          Nombre de passagers
          <input name="passengers" defaultValue="40" inputMode="numeric" />
        </label>
      </div>

      <div className={styles.callbackChoice} aria-label="Rappel conseiller">
        <span>Souhaitez-vous etre rappele ?</span>
        <button
          className={callbackWanted === "yes" ? styles.choiceActive : styles.choice}
          type="button"
          onClick={() => setCallbackWanted("yes")}
          aria-pressed={callbackWanted === "yes"}
        >
          Oui
        </button>
        <button
          className={callbackWanted === "no" ? styles.choiceActive : styles.choice}
          type="button"
          onClick={() => setCallbackWanted("no")}
          aria-pressed={callbackWanted === "no"}
        >
          Non
        </button>
      </div>

      <div className={styles.optionGroup} aria-label="Options">
        <span>Options</span>
        <div>
          {optionLabels.map((option) => {
            const checked =
              selectedOptions.includes(option) ||
              (hasIntermediateStops && option === "Arrets multiples");

            return (
              <label key={option} className={checked ? styles.optionActive : styles.option}>
                <input
                  checked={checked}
                  disabled={hasIntermediateStops && option === "Arrets multiples"}
                  name="options"
                  type="checkbox"
                  value={option}
                  onChange={() => toggleOption(option)}
                />
                {option}
              </label>
            );
          })}
        </div>
      </div>

      <button className={styles.submitButton} type="submit">
        Demander une estimation
      </button>
      <p className={styles.safety}>
        Prix verifie - relances suivies - reprise humaine si necessaire
      </p>
    </form>
  );
}
