"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PublicPageHeader } from "@/app/client/PublicPageShell";
import { clientHumanReviewNotice } from "@/features/human-review/clientNotice";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";
import { localizedSendError } from "@/lib/ai/chat-locale";
import { useSiteLanguage } from "@/shared/i18n/useSiteLanguage";
import {
  PAX_MAX,
  isPastDate,
  isPaxBelowMin,
  isPaxOverMax,
  isReturnBeforeDeparture,
  isValidDateString,
} from "@/shared/lib/validation/leadValidators";
import type { DemandDraft } from "@/shared/types/lead";
import styles from "./demand.module.css";

type FieldWarning = { field: string; message: string; blocking: boolean };

type InitialDemand = {
  departure?: string;
  arrival?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: string;
  tripType?: string;
  options?: string;
  intermediateStops?: string;
  callback?: string;
};

type RoutePreview = {
  distanceKm: number;
  durationMinutes: number;
  labels: string[];
  geometry: [number, number][];
  bbox?: [number, number, number, number];
};

type LeafletLayer = {
  addTo: (target: LeafletMap) => LeafletLayer;
  remove: () => void;
};

type LeafletPolyline = LeafletLayer & {
  getBounds: () => unknown;
};

type LeafletMap = {
  fitBounds: (bounds: unknown, options?: { padding?: [number, number]; maxZoom?: number }) => void;
  getZoom: () => number;
  invalidateSize: () => void;
  remove: () => void;
  setZoom: (zoom: number) => void;
};

type LeafletNamespace = {
  circleMarker: (
    coordinates: [number, number],
    options: Record<string, string | number | boolean>
  ) => LeafletLayer;
  map: (
    element: HTMLElement,
    options?: { attributionControl?: boolean; scrollWheelZoom?: boolean; zoomControl?: boolean }
  ) => LeafletMap;
  polyline: (coordinates: [number, number][], options: Record<string, string | number>) => LeafletPolyline;
  tileLayer: (url: string, options?: Record<string, string | number>) => LeafletLayer;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
    neoTravelLeafletLoader?: Promise<LeafletNamespace>;
  }
}

const steps = ["Trajet", "Vérification", "Devis"];

// Options the prospect can request. Péages are route-dependent and must stay automatic,
// not customer-selectable.
const AVAILABLE_OPTIONS: { code: string; label: string; hint: string }[] = [
  { code: "guide", label: "Guide / accompagnateur", hint: "+80 €/jour" },
  { code: "driver_overnight", label: "Nuit chauffeur", hint: "+120 €/nuit" },
];

// Display-only estimates mirroring the engine's Tableau 3 rates. calculer_devis() stays the
// sole pricing authority; these only preview the supplément while the prospect fills the form.
const GUIDE_DAY_RATE_EUR = 80;
const DRIVER_NIGHT_RATE_EUR = 120;

const OPTION_ALIASES = new Map(
  AVAILABLE_OPTIONS.flatMap((option) => [
    [option.code, option.code],
    [option.label.toLocaleLowerCase("fr-FR"), option.code],
  ])
);
const missingFieldLabels: Partial<Record<keyof DemandDraft, string>> = {
  organization: "Nom de l'organisation",
  email: "Email de contact",
  departureCity: "Ville de départ",
  arrivalCity: "Ville d'arrivée",
  departureDate: "Date de départ",
  returnDate: "Date de retour",
  passengerCount: "Nombre de passagers",
  tripType: "Type de trajet"
};

function clean(value: string | undefined, fallback = "") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeEmailForApi(email: string | null) {
  const trimmed = email?.trim();
  if (!trimmed) return null;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function splitValues(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionCodes(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => OPTION_ALIASES.get(value.trim().toLocaleLowerCase("fr-FR")) ?? value.trim())
        .filter((value) => AVAILABLE_OPTIONS.some((option) => option.code === value))
    ),
  ];
}

function optionLabels(codes: string[]) {
  return codes
    .map((code) => AVAILABLE_OPTIONS.find((option) => option.code === code)?.label)
    .filter((label): label is string => Boolean(label));
}

function formatDate(value: string | undefined, fallback = "") {
  if (!value) return fallback;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return "Durée à confirmer";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;

  return `${hours} h ${String(rest).padStart(2, "0")}`;
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (window.neoTravelLeafletLoader) return window.neoTravelLeafletLoader;

  window.neoTravelLeafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-neotravel-leaflet="true"]')) {
      const link = document.createElement("link");
      link.dataset.neotravelLeaflet = "true";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("LEAFLET_UNAVAILABLE")));
    script.onerror = () => reject(new Error("LEAFLET_LOAD_FAILED"));
    document.body.appendChild(script);
  });

  return window.neoTravelLeafletLoader;
}

const SESSION_CACHE_KEY = "neotravel:demand-session:v1";
const ROUTE_PREVIEW_DEBOUNCE_MS = 650;
const MIN_ROUTE_LABEL_LENGTH = 2;

type ChatExtracted = {
  clientType: string | null;
  contactName: string | null;
  organization: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengerCount: number | null;
  tripType: "one_way" | "round_trip" | null;
  phone: string | null;
};

type DemandSessionCache = {
  chatMessages: { role: "user" | "assistant"; content: string }[];
  currentLeadId: string | null;
  qualifiedLeadId: string | null;
  chatHumanReview: boolean;
  chatEmail: string | null;
  chatClientType?: string | null;
  chatContactName?: string | null;
  chatOrganization?: string | null;
  chatPhone?: string | null;
  chatExtracted: ChatExtracted;
  selectedOptions?: string[];
  multiDestination?: boolean;
  stops?: string[];
  guideDays?: number | null;
  driverNights?: number | null;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

function normalizeRouteLabel(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function isRouteLabelReady(value: string) {
  return value.length >= MIN_ROUTE_LABEL_LENGTH;
}

function removeLeafletLayer(layer: LeafletLayer) {
  try {
    layer.remove();
  } catch {
    return;
  }
}

function removeLeafletMap(map: LeafletMap | null) {
  try {
    map?.remove();
  } catch {
    return;
  }
}

// Session persistence: survives refresh and client-side navigation, clears when the tab
// closes. Crucial for currentLeadId — without it a refresh orphans the Supabase lead and
// the next message would spawn a duplicate instead of enriching the existing one.
function readDemandSession(): DemandSessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemandSessionCache;
    if (!parsed || !Array.isArray(parsed.chatMessages) || !parsed.chatExtracted) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDemandSession(cache: DemandSessionCache) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage disabled or full — the session just won't persist, no crash.
  }
}

function clearDemandSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function DemandConversation({ initialDemand = {} }: { initialDemand?: InitialDemand }) {
  const router = useRouter();
  const language = useSiteLanguage();
  const hasInitialDemand = Boolean(
    initialDemand.departure?.trim() ||
      initialDemand.arrival?.trim() ||
      initialDemand.departureDate?.trim() ||
      initialDemand.passengers?.trim() ||
      initialDemand.options?.trim() ||
      initialDemand.intermediateStops?.trim()
  );
  const demand = useMemo(() => {
    const intermediateStops = splitValues(initialDemand.intermediateStops);
    const options = normalizeOptionCodes(splitValues(initialDemand.options));
    const departure = clean(initialDemand.departure);
    const arrival = clean(initialDemand.arrival);
    const departureDate = formatDate(initialDemand.departureDate);
    const returnDate = formatDate(initialDemand.returnDate);
    const tripType = initialDemand.tripType === "one_way" ? "Aller simple" : "Aller-retour";

    return {
      departure,
      arrival,
      departureDate,
      returnDate,
      passengers: clean(initialDemand.passengers),
      tripType,
      options,
      intermediateStops,
      callbackWanted: initialDemand.callback === "no" ? "Non" : "Oui"
    };
  }, [initialDemand]);

  // State declarations must come before useMemo that depend on them
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [mapZoom, setMapZoom] = useState(1);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isRequestingHumanReview, setIsRequestingHumanReview] = useState(false);
  const [humanReviewQueued, setHumanReviewQueued] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [qualifiedLeadId, setQualifiedLeadId] = useState<string | null>(null);
  const [chatHumanReview, setChatHumanReview] = useState(false);
  const [chatEmail, setChatEmail] = useState<string | null>(null);
  const [chatClientType, setChatClientType] = useState<string | null>(null);
  const [chatContactName, setChatContactName] = useState<string | null>(null);
  const [chatOrganization, setChatOrganization] = useState<string | null>(null);
  const [chatPhone, setChatPhone] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(() => demand.options);
  const [multiDestination, setMultiDestination] = useState(() => demand.intermediateStops.length > 0);
  const [stops, setStops] = useState<string[]>(() => demand.intermediateStops);
  const [guideDays, setGuideDays] = useState<number | null>(null);
  const [driverNights, setDriverNights] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatExtracted, setChatExtracted] = useState<ChatExtracted>({
    clientType: null,
    contactName: null,
    organization: null,
    departureCity: null,
    arrivalCity: null,
    departureDate: null,
    returnDate: null,
    passengerCount: null,
    tripType: null,
    phone: null,
  });

  // Hydrate a prior session on mount, then persist the meaningful slice on every change.
  // hydratedRef prevents the persist effect from overwriting the cache with empty initial
  // state before hydration runs (which would also avoid an SSR hydration mismatch).
  const hydratedRef = useRef(false);
  useEffect(() => {
    const cached = readDemandSession();
    if (cached) {
      setChatMessages(cached.chatMessages);
      setCurrentLeadId(cached.currentLeadId);
      setQualifiedLeadId(cached.qualifiedLeadId);
      setChatHumanReview(cached.chatHumanReview);
      setChatEmail(cached.chatEmail);
      setChatClientType(cached.chatClientType ?? cached.chatExtracted.clientType ?? null);
      setChatContactName(cached.chatContactName ?? cached.chatExtracted.contactName ?? null);
      setChatOrganization(cached.chatOrganization ?? cached.chatExtracted.organization ?? null);
      setChatPhone(cached.chatPhone ?? cached.chatExtracted.phone ?? null);
      setChatExtracted(cached.chatExtracted);
      setSelectedOptions(normalizeOptionCodes(cached.selectedOptions ?? []));
      setMultiDestination(Boolean(cached.multiDestination));
      setStops(cached.stops ?? []);
      setGuideDays(cached.guideDays ?? null);
      setDriverNights(cached.driverNights ?? null);
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (chatMessages.length === 0 && !currentLeadId) return; // nothing worth persisting yet
    writeDemandSession({
      chatMessages,
      currentLeadId,
      qualifiedLeadId,
      chatHumanReview,
      chatEmail,
      chatClientType,
      chatContactName,
      chatOrganization,
      chatPhone,
      chatExtracted,
      selectedOptions,
      multiDestination,
      stops,
      guideDays,
      driverNights,
    });
  }, [chatMessages, currentLeadId, qualifiedLeadId, chatHumanReview, chatEmail, chatClientType, chatContactName, chatOrganization, chatPhone, chatExtracted, selectedOptions, multiDestination, stops, guideDays, driverNights]);

  // activeDemand: fusionne URL params + ce que le chat a extrait + éditions manuelles
  const activeDemand = useMemo(() => ({
    clientType: chatClientType || chatExtracted.clientType || null,
    contactName: chatContactName || chatExtracted.contactName || null,
    organization: chatOrganization || chatExtracted.organization || null,
    departureCity: chatExtracted.departureCity || demand.departure || null,
    arrivalCity: chatExtracted.arrivalCity || demand.arrival || null,
    departureDate: chatExtracted.departureDate || initialDemand.departureDate?.trim() || null,
    returnDate: chatExtracted.returnDate || initialDemand.returnDate?.trim() || null,
    passengerCount:
      chatExtracted.passengerCount ??
      (demand.passengers && Number.isFinite(Number(demand.passengers))
        ? Number(demand.passengers)
        : null),
    tripType: chatExtracted.tripType ?? (initialDemand.tripType === "one_way" ? "one_way" as const : initialDemand.tripType ? "round_trip" as const : null),
    phone: chatPhone || chatExtracted.phone || null,
    options: selectedOptions,
  }), [chatClientType, chatContactName, chatOrganization, chatPhone, chatExtracted, demand, initialDemand, selectedOptions]);

  // Client-side validation mirrors the server (same shared validators) for instant
  // feedback on manual edits. The quote button is gated on these.
  const fieldWarnings = useMemo<FieldWarning[]>(() => {
    const list: FieldWarning[] = [];
    const { departureDate, returnDate, passengerCount } = activeDemand;
    if (departureDate && !isValidDateString(departureDate)) {
      list.push({ field: "departureDate", message: "Date de départ invalide.", blocking: true });
    } else if (isPastDate(departureDate)) {
      list.push({ field: "departureDate", message: "La date de départ est déjà passée.", blocking: true });
    }
    if (isReturnBeforeDeparture(departureDate, returnDate)) {
      list.push({ field: "returnDate", message: "Le retour est avant le départ.", blocking: true });
    }
    if (isPaxBelowMin(passengerCount)) {
      list.push({ field: "passengerCount", message: "Nombre de passagers invalide.", blocking: true });
    } else if (isPaxOverMax(passengerCount)) {
      list.push({
        field: "passengerCount",
        message: `Au-delà de ${PAX_MAX} passagers, un conseiller vous recontacte.`,
        blocking: true,
      });
    }
    return list;
  }, [activeDemand]);
  const hasBlockingWarning = fieldWarnings.some((w) => w.blocking);
  const warningFor = (field: string) => fieldWarnings.find((w) => w.field === field);

  const demandDraft = useMemo<DemandDraft>(
    () => ({
      rawMessage: undefined,
      clientType: activeDemand.clientType,
      contactName: activeDemand.contactName,
      organization: activeDemand.organization,
      email: chatEmail,
      phone: activeDemand.phone,
      departureCity: activeDemand.departureCity,
      arrivalCity: activeDemand.arrivalCity,
      departureDate: activeDemand.departureDate,
      returnDate: activeDemand.returnDate,
      passengerCount: activeDemand.passengerCount,
      tripType: activeDemand.tripType,
      options: activeDemand.options,
    }),
    [activeDemand, chatEmail]
  );
  const missingFields = useMemo(
    () =>
      validateDemandCompleteness(demandDraft).missingFields.map(
        (field) => missingFieldLabels[field] ?? String(field)
      ),
    [demandDraft]
  );
  const demoBlockingMissingFields = missingFields.filter(
    (field) => field !== missingFieldLabels.organization && field !== missingFieldLabels.email
  );
  const hasAnyDemand = Boolean(activeDemand.departureCity || activeDemand.arrivalCity || activeDemand.passengerCount || activeDemand.departureDate);
  const requiresHumanReview = hasAnyDemand && demoBlockingMissingFields.length > 0;

  // Quote readiness is decided form-side, from the side-panel fields — NOT from the AI's
  // qualification status. These are exactly the 5 fields the server needs to price.
  // returnDate and email are intentionally optional (server doesn't require them).
  const criticalLabels: Record<string, string> = {
    departureCity: "ville de départ",
    arrivalCity: "ville d'arrivée",
    departureDate: "date de départ",
    passengerCount: "nombre de passagers",
    tripType: "type de trajet (aller simple / aller-retour)",
  };
  const criticalMissing = (
    ["departureCity", "arrivalCity", "departureDate", "passengerCount", "tripType"] as const
  ).filter((key) => {
    const value = activeDemand[key];
    return value === null || value === undefined || value === "";
  });
  const missingReturnDate = activeDemand.tripType === "round_trip" && !activeDemand.returnDate;
  const missingRequirementLabels = [
    ...criticalMissing.map((key) => criticalLabels[key]),
    ...(missingReturnDate ? ["date de retour"] : []),
  ];
  const formReady = missingRequirementLabels.length === 0 && !hasBlockingWarning;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routeLayersRef = useRef<LeafletLayer[]>([]);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const mainStop = stops[0];

  useEffect(() => {
    const container = chatMessagesRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isSending]);

  const hasActiveSession = chatMessages.length > 0 || Boolean(currentLeadId);

  function resetSession() {
    clearDemandSession();
    setChatMessages([]);
    setCurrentLeadId(null);
    setQualifiedLeadId(null);
    setChatHumanReview(false);
    setChatEmail(null);
    setChatClientType(null);
    setChatContactName(null);
    setChatOrganization(null);
    setChatPhone(null);
    setSelectedOptions([]);
    setMultiDestination(false);
    setStops([]);
    setGuideDays(null);
    setDriverNights(null);
    setChatExtracted({
      clientType: null,
      contactName: null,
      organization: null,
      departureCity: null,
      arrivalCity: null,
      departureDate: null,
      returnDate: null,
      passengerCount: null,
      tripType: null,
      phone: null,
    });
    setUserInput("");
    setWorkflowError(null);
    setHumanReviewQueued(false);
  }

  function toggleOption(code: string) {
    setSelectedOptions((prev) => {
      if (prev.includes(code)) {
        if (code === "guide") setGuideDays(null);
        if (code === "driver_overnight") setDriverNights(null);
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  }

  function updateTripType(value: string) {
    if (value === "multi_stop") {
      setMultiDestination(true);
      setChatExtracted((prev) => ({ ...prev, tripType: prev.tripType ?? "one_way" }));
      return;
    }

    setMultiDestination(false);
    setStops([]);
    setChatExtracted((prev) => ({
      ...prev,
      tripType: value ? (value as "one_way" | "round_trip") : null,
    }));
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = userInput.trim();
    if (!text || isSending) return;

    const nextMessages = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(nextMessages);
    setUserInput("");
    setIsSending(true);
    setWorkflowError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          language,
          ...(currentLeadId ? { leadId: currentLeadId } : {}),
        }),
      });
      const data = (await res.json()) as {
        status: string;
        message: string;
        leadId?: string;
        quoteId?: string;
        extractedFields?: {
          clientType: string | null;
          contactName: string | null;
          organization: string | null;
          departureCity: string | null;
          arrivalCity: string | null;
          departureDate: string | null;
          returnDate: string | null;
          passengerCount: number | null;
          tripType: "one_way" | "round_trip" | null;
          email: string | null;
          phone: string | null;
          options?: string[];
          removedOptions?: string[];
          multiDestination?: boolean;
          stops?: string[];
        };
      };

      if (data.leadId) setCurrentLeadId(data.leadId);
      if (data.status === "QUALIFIED" && data.leadId) setQualifiedLeadId(data.leadId);
      if (data.status === "HUMAN_REVIEW") {
        setChatHumanReview(true);
        setReviewNotice(clientHumanReviewNotice((data as { reviewReason?: string }).reviewReason));
      }
      const ef = data.extractedFields;
      if (ef) {
        if (ef.email) setChatEmail(ef.email);
        if (ef.clientType) setChatClientType(ef.clientType);
        if (ef.contactName) setChatContactName(ef.contactName);
        if (ef.organization) setChatOrganization(ef.organization);
        if (ef.phone) setChatPhone(ef.phone);
        if (ef.options?.length) setSelectedOptions((prev) => normalizeOptionCodes([...prev, ...ef.options!]));
        if (ef.removedOptions?.length) {
          const removed = ef.removedOptions;
          setSelectedOptions((prev) => prev.filter((code) => !removed.includes(code)));
          if (removed.includes("guide")) setGuideDays(null);
          if (removed.includes("driver_overnight")) setDriverNights(null);
        }
        if (ef.multiDestination) setMultiDestination(true);
        if (ef.stops?.length) setStops(ef.stops);
        setChatExtracted((prev) => ({
          clientType: ef.clientType ?? prev.clientType,
          contactName: ef.contactName ?? prev.contactName,
          organization: ef.organization ?? prev.organization,
          departureCity: ef.departureCity ?? prev.departureCity,
          arrivalCity: ef.arrivalCity ?? prev.arrivalCity,
          departureDate: ef.departureDate ?? prev.departureDate,
          returnDate: ef.returnDate ?? prev.returnDate,
          passengerCount: ef.passengerCount ?? prev.passengerCount,
          tripType: ef.tripType ?? prev.tripType,
          phone: ef.phone ?? prev.phone,
        }));
      }
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      // The chat never auto-generates or navigates to a quote. Quote generation is an explicit
      // user action via the "Recevoir mon devis" button (generateClientQuote).
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: localizedSendError(language),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function generateClientQuote() {
    setWorkflowError(null);
    setReviewNotice(null);

    if (hasBlockingWarning) {
      setWorkflowError("Corrigez les informations signalées avant de demander un devis.");
      return;
    }

    if (!formReady) {
      const missing = missingRequirementLabels.join(", ");
      setWorkflowError(`Complétez le trajet pour recevoir votre devis : ${missing}.`);
      return;
    }

    // One path for both chat and manual side-panel entry: persist the current form state
    // to a lead (the sync route CREATES one when no leadId is given), attach the email so
    // a client exists for the devis, let the server validate, then quote. No need to talk
    // to the AI first.
    setIsGeneratingQuote(true);
    try {
      const syncResponse = await fetch("/api/leads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(currentLeadId ? { leadId: currentLeadId } : {}),
          clientType: activeDemand.clientType,
          contactName: activeDemand.contactName,
          organization: activeDemand.organization,
          departureCity: activeDemand.departureCity,
          arrivalCity: activeDemand.arrivalCity,
          departureDate: activeDemand.departureDate,
          returnDate: activeDemand.tripType === "round_trip" ? activeDemand.returnDate : null,
          passengerCount: activeDemand.passengerCount,
          tripType: activeDemand.tripType,
          hasIntermediateStop: multiDestination,
          intermediateStops: stops,
          options: selectedOptions,
          guideDays: selectedOptions.includes("guide") ? guideDays : null,
          driverNights: selectedOptions.includes("driver_overnight") ? driverNights : null,
          email: normalizeEmailForApi(chatEmail),
          phone: activeDemand.phone,
        }),
      });
      const sync = (await syncResponse.json()) as {
        status: string;
        message: string;
        leadId?: string;
        reviewReason?: string;
      };

      if (sync.status === "HUMAN_REVIEW") {
        if (sync.leadId) setCurrentLeadId(sync.leadId);
        setChatHumanReview(true);
        setReviewNotice(clientHumanReviewNotice(sync.reviewReason));
        return;
      }

      if (sync.status !== "QUALIFIED" || !sync.leadId) {
        setWorkflowError(sync.message || "Il manque encore quelques informations pour finaliser votre demande.");
        return;
      }
      setCurrentLeadId(sync.leadId);

      const quoteResponse = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: sync.leadId }),
      });
      const quotePayload = (await quoteResponse.json().catch(() => null)) as {
        id?: string;
        status?: string;
        error?: string;
      } | null;

      if (!quoteResponse.ok) {
        if (quotePayload?.status === "HUMAN_REVIEW") {
          setChatHumanReview(true);
          setReviewNotice(clientHumanReviewNotice(quotePayload.error));
          return;
        }
        setWorkflowError("Nous n'avons pas pu finaliser votre devis pour l'instant. Vous pouvez réessayer ou nous contacter.");
        return;
      }

      if (!quotePayload?.id) {
        setWorkflowError("Nous n'avons pas pu finaliser votre devis pour l'instant. Vous pouvez réessayer ou nous contacter.");
        return;
      }

      clearDemandSession();
      router.push(`/connexion/inscription?quoteId=${encodeURIComponent(quotePayload.id)}`);
    } catch {
      setWorkflowError("Nous n’avons pas pu finaliser votre devis pour l’instant. Vous pouvez réessayer ou nous contacter.");
    } finally {
      setIsGeneratingQuote(false);
    }
  }

  async function requestHumanReview() {
    if (isRequestingHumanReview) return;
    setWorkflowError(null);
    setIsRequestingHumanReview(true);

    try {
      let leadId = currentLeadId;

      if (!leadId) {
        const leadResponse = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawMessage: [
              activeDemand.departureCity && activeDemand.arrivalCity
                ? `Trajet ${activeDemand.departureCity} vers ${activeDemand.arrivalCity}`
                : "Demande transmise à un conseiller depuis le formulaire",
              activeDemand.departureDate ? `départ ${activeDemand.departureDate}` : null,
              activeDemand.passengerCount ? `${activeDemand.passengerCount} passagers` : null,
            ]
              .filter(Boolean)
              .join(" — "),
            clientType: activeDemand.clientType,
            contactName: activeDemand.contactName,
            organization: activeDemand.organization,
            email: normalizeEmailForApi(chatEmail),
            phone: activeDemand.phone,
            departureCity: activeDemand.departureCity,
            arrivalCity: activeDemand.arrivalCity,
            departureDate: activeDemand.departureDate,
            returnDate: activeDemand.tripType === "round_trip" ? activeDemand.returnDate : null,
            passengerCount: activeDemand.passengerCount,
            tripType: activeDemand.tripType,
            hasIntermediateStop: multiDestination,
            intermediateStops: stops,
            options: activeDemand.options,
            qualify: false,
          }),
        });

        if (!leadResponse.ok) throw new Error("LEAD_CREATION_FAILED");
        const leadPayload = (await leadResponse.json()) as { leadId?: string };
        if (!leadPayload.leadId) throw new Error("LEAD_CREATION_FAILED");
        leadId = leadPayload.leadId;
        setCurrentLeadId(leadId);
      }

      const reviewResponse = await fetch("/api/human-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          reason: "PROSPECT_REQUESTED_HUMAN_REVIEW",
        }),
      });

      if (!reviewResponse.ok) throw new Error("HUMAN_REVIEW_FAILED");

      setChatHumanReview(true);
      setHumanReviewQueued(true);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Votre demande est transmise à un conseiller. Elle apparaît maintenant dans le tableau de suivi commercial.",
        },
      ]);
    } catch {
      setWorkflowError("Nous n’avons pas pu transmettre la demande. Réessayez dans un instant.");
    } finally {
      setIsRequestingHumanReview(false);
    }
  }

  const routeInput = useMemo(() => {
    const departure = normalizeRouteLabel(activeDemand.departureCity);
    const arrival = normalizeRouteLabel(activeDemand.arrivalCity);
    const intermediateStops = stops
      .map(normalizeRouteLabel)
      .filter(isRouteLabelReady);

    return { departure, arrival, intermediateStops };
  }, [activeDemand.departureCity, activeDemand.arrivalCity, stops]);
  const debouncedRouteInput = useDebouncedValue(routeInput, ROUTE_PREVIEW_DEBOUNCE_MS);
  const selectedOptionLabels = optionLabels(selectedOptions);

  useEffect(() => {
    if (!isRouteLabelReady(debouncedRouteInput.departure) || !isRouteLabelReady(debouncedRouteInput.arrival)) {
      setRoutePreview(null);
      setRouteStatus("idle");
      return;
    }

    const controller = new AbortController();

    async function loadRoutePreview() {
      setRouteStatus("loading");
      try {
        const response = await fetch("/api/routes/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departure: debouncedRouteInput.departure,
            arrival: debouncedRouteInput.arrival,
            intermediateStops: debouncedRouteInput.intermediateStops,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("ROUTE_PREVIEW_FAILED");
        const payload = (await response.json()) as RoutePreview;
        setRoutePreview(payload);
        setRouteStatus("ready");
      } catch {
        if (!controller.signal.aborted) {
          setRoutePreview(null);
          setRouteStatus("fallback");
        }
      }
    }

    loadRoutePreview();

    return () => controller.abort();
  }, [debouncedRouteInput]);

  useEffect(() => {
    if (!routePreview?.geometry.length || !mapContainerRef.current) {
      routeLayersRef.current.forEach(removeLeafletLayer);
      routeLayersRef.current = [];
      return;
    }
    let cancelled = false;

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapContainerRef.current || !mapContainerRef.current.isConnected) return;
        const coordinates = routePreview.geometry.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];

        if (!mapRef.current) {
          mapRef.current = leaflet.map(mapContainerRef.current, {
            attributionControl: true,
            scrollWheelZoom: false,
            zoomControl: false
          });
          leaflet
            .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap"
            })
            .addTo(mapRef.current);
        }

        routeLayersRef.current.forEach(removeLeafletLayer);
        const routeLine = leaflet.polyline(coordinates, {
            color: "#d69b2d",
            opacity: 0.96,
            weight: 6
          });
        routeLine.addTo(mapRef.current);
        const startMarker = leaflet
          .circleMarker(start, {
            color: "#ffffff",
            fillColor: "#123885",
            fillOpacity: 1,
            radius: 7,
            weight: 4
          })
          .addTo(mapRef.current);
        const endMarker = leaflet
          .circleMarker(end, {
            color: "#ffffff",
            fillColor: "#d51b29",
            fillOpacity: 1,
            radius: 7,
            weight: 4
          })
          .addTo(mapRef.current);

        routeLayersRef.current = [routeLine, startMarker, endMarker];
        mapRef.current.fitBounds(routeLine.getBounds(), { padding: [22, 22], maxZoom: 13 });
        mapRef.current.setZoom(Math.min(13, Math.max(5, mapRef.current.getZoom() + mapZoom - 1)));
        window.setTimeout(() => {
          try {
            mapRef.current?.invalidateSize();
          } catch {
            return;
          }
        }, 60);
      })
      .catch(() => setRouteStatus("fallback"));

    return () => {
      cancelled = true;
    };
  }, [routePreview]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        mapRef.current?.invalidateSize();
      } catch {
        return;
      }
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [isMapExpanded]);

  useEffect(() => {
    return () => {
      routeLayersRef.current.forEach(removeLeafletLayer);
      routeLayersRef.current = [];
      removeLeafletMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  function changeMapZoom(direction: 1 | -1) {
    setMapZoom((current) => {
      const next = Math.min(3, Math.max(1, current + direction));
      try {
        const map = mapRef.current;
        if (map) map.setZoom(Math.min(13, Math.max(5, map.getZoom() + direction)));
      } catch {
        return next;
      }
      return next;
    });
  }

  function renderQuoteValidationActions(
    className: string,
    { alwaysShowButton = false }: { alwaysShowButton?: boolean } = {}
  ) {
    const showQuoteButton = alwaysShowButton || chatHumanReview || formReady;

    return (
      <div className={className}>
        {showQuoteButton ? (
          chatHumanReview ? (
            <button
              className={styles.humanReviewButton}
              type="button"
              disabled={isRequestingHumanReview || humanReviewQueued}
              onClick={() => void requestHumanReview()}
            >
              {humanReviewQueued
                ? "Demande transmise"
                : isRequestingHumanReview
                  ? "Transmission en cours…"
                  : "Transmettre à un conseiller"}
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              type="button"
              disabled={isGeneratingQuote || hasBlockingWarning || !formReady}
              onClick={() => void generateClientQuote()}
            >
              {isGeneratingQuote ? "Création du devis…" : "Recevoir mon devis"}
            </button>
          )
        ) : null}
        {hasBlockingWarning ? (
          <p className={styles.workflowError}>{fieldWarnings.find((w) => w.blocking)?.message}</p>
        ) : !formReady && hasAnyDemand ? (
          <p className={styles.workflowHint}>Encore besoin de : {missingRequirementLabels.join(", ")}.</p>
        ) : formReady && !reviewNotice ? (
          <p className={styles.workflowReady}>Trajet complet — créez votre compte pour accéder au devis.</p>
        ) : null}
        {reviewNotice ? <p className={styles.workflowReview}>{reviewNotice}</p> : null}
        {workflowError ? <p className={styles.workflowError}>{workflowError}</p> : null}
        {humanReviewQueued ? (
          <p className={styles.workflowReady}>Un commercial peut reprendre cette demande dans le dashboard.</p>
        ) : null}
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <PublicPageHeader />

      <section className={styles.hero}>
        <div>
          <h1>Préparer votre trajet</h1>
          <p>
            Décrivez votre trajet, vos dates et vos options : NeoTravel rassemble les informations utiles pour préparer
            votre devis.
          </p>
        </div>
        <Link className={styles.heroCallButton} href="/client/contact">
          Nous contacter
        </Link>
      </section>

      <section className={styles.progressCard} aria-label="Progression de votre demande">
        <strong>Progression de votre demande</strong>
        <ol className={styles.progress}>
          {steps.map((step, index) => {
            const trajetDone = formReady;
            const verificationDone = trajetDone && !hasBlockingWarning && Boolean(qualifiedLeadId);
            const stepDone = [trajetDone, verificationDone, false];
            const firstIncomplete = stepDone.findIndex((d) => !d);
            const cls = stepDone[index]
              ? styles.doneStep
              : index === firstIncomplete
                ? styles.currentStep
                : styles.nextStep;
            return (
              <li key={step} className={cls}>
                <span>{index + 1}</span>
                {step}
              </li>
            );
          })}
        </ol>
      </section>

      <div className={styles.layout}>
        <section className={styles.chatCard} aria-labelledby="conversation-title">
          <div className={styles.chatCardHeader}>
            <h2 id="conversation-title">Conversation</h2>
            {hasActiveSession ? (
              <button type="button" className={styles.resetButton} onClick={resetSession}>
                Nouvelle demande
              </button>
            ) : null}
          </div>
          <div ref={chatMessagesRef} className={styles.chatMessages} data-no-translate translate="no">
            {hasInitialDemand ? (
              <>
                <div className={`${styles.message} ${styles.prospect}`}>
                  <strong>Vous</strong>
                  <p>
                    Bonjour, nous devons transporter {demand.passengers} personnes de {demand.departure} à{" "}
                    {demand.arrival} le {demand.departureDate.toLowerCase()}
                    {demand.tripType === "Aller-retour" ? `, retour le ${demand.returnDate.toLowerCase()}` : ""}.
                  </p>
                </div>
                <div className={`${styles.message} ${styles.assistant}`}>
                  <strong>NeoTravel</strong>
                  <p>
                    J’ai noté {demand.departure} - {demand.arrival}, {demand.passengers} passagers,{" "}
                    {demand.tripType.toLowerCase()}. Souhaitez-vous confirmer les horaires et l&apos;organisation ?
                  </p>
                </div>
                <div className={`${styles.message} ${styles.prospect}`}>
                  <strong>Vous</strong>
                  <p>
                    {mainStop ? `Une étape à ${mainStop}. ` : ""}
                    Options demandées : {selectedOptionLabels.join(", ") || "aucune option particulière"}.
                  </p>
                </div>
              </>
            ) : (
              <div className={`${styles.message} ${styles.assistant}`}>
                <strong>NeoTravel</strong>
                <p>Bonjour, comment puis-je vous aider à organiser votre trajet de groupe ?</p>
              </div>
            )}
            <div className={`${styles.message} ${styles.assistant}`}>
              <strong>NeoTravel</strong>
              <p>
                {hasInitialDemand && missingFields.length
                  ? requiresHumanReview
                    ? `Il manque encore : ${demoBlockingMissingFields.join(", ")}. Un conseiller pourra vérifier votre demande.`
                    : "Les informations de trajet sont suffisantes. Ajoutez le type de client, le nom du contact, le téléphone et l'email avant l'envoi."
                  : hasInitialDemand
                    ? "Merci, les informations principales sont complètes pour finaliser votre devis. Indiquez aussi le type de client, le nom du contact et le téléphone."
                    : "Indiquez simplement votre départ, votre arrivée, la date, le nombre de passagers, puis le type de client, le nom du contact et le téléphone."}
              </p>
            </div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${msg.role === "user" ? styles.prospect : styles.assistant}`}>
                <strong>{msg.role === "user" ? "Vous" : "NeoTravel"}</strong>
                <p>{msg.content}</p>
              </div>
            ))}
            {isSending && (
              <div className={styles.thinkingBubble} aria-label="Réponse en cours">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <form className={styles.composer} onSubmit={sendMessage}>
            <label className={styles.srOnly} htmlFor="demand-message">
              Préciser heure, organisation, commentaire
            </label>
            <textarea
              id="demand-message"
              name="message"
              placeholder="Préciser heure, organisation, commentaire..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={isSending}
            />
          </form>
          <div className={styles.chatActions}>
            <button
              className={styles.sendButton}
              type="button"
              disabled={isSending || !userInput.trim()}
              onClick={() => void sendMessage()}
            >
              {isSending ? "Envoi en cours…" : "Envoyer mon message"}
            </button>
            {renderQuoteValidationActions(styles.chatQuoteActions)}
          </div>
        </section>

        <div className={styles.sideStack}>
          <aside className={styles.sidePanel} id="infos" aria-labelledby="trip-panel-title">
            <div className={styles.routeHeader}>
              <div>
                <p>Votre trajet</p>
                <h2 id="trip-panel-title">
                  {activeDemand.departureCity && activeDemand.arrivalCity
                    ? `${activeDemand.departureCity} vers ${activeDemand.arrivalCity}`
                    : "Trajet en attente"}
                </h2>
              </div>
              <span>{routeStatus === "loading" ? "Calcul..." : routePreview ? `${routePreview.distanceKm} km` : "À confirmer"}</span>
            </div>

            <div
              className={isMapExpanded ? `${styles.mapBox} ${styles.mapBoxExpanded}` : styles.mapBox}
              aria-label="Carte du trajet"
            >
              <div className={styles.leafletMap} ref={mapContainerRef} />
              {activeDemand.departureCity && activeDemand.arrivalCity ? (
                <>
                  <div className={styles.mapControls} aria-label="Contrôle carte">
                    <button type="button" onClick={() => changeMapZoom(1)}>
                      +
                    </button>
                    <button type="button" onClick={() => changeMapZoom(-1)}>
                      -
                    </button>
                    <button type="button" onClick={() => setIsMapExpanded((current) => !current)}>
                      {isMapExpanded ? "Réduire" : "Agrandir"}
                    </button>
                  </div>
                  {routeStatus === "fallback" ? <span className={styles.mapLine} /> : null}
                </>
              ) : (
                <div className={styles.routeEmptyOverlay}>
                  Le trajet s&apos;affichera ici dès les premières informations.
                </div>
              )}
            </div>

            <dl className={styles.routeFacts}>
              <div>
                <dt>Départ</dt>
                <dd>
                  {activeDemand.departureCity || "En attente"}
                  {activeDemand.departureDate ? ` - ${formatDate(activeDemand.departureDate)}` : ""}
                </dd>
              </div>
              {mainStop ? (
                <div>
                  <dt>Étape</dt>
                  <dd>Pause intermédiaire à {mainStop}</dd>
                </div>
              ) : null}
              <div>
                <dt>Arrivée</dt>
                <dd>
                  {activeDemand.arrivalCity || "En attente"}
                  {activeDemand.tripType === "round_trip" && demand.returnDate
                    ? ` - retour le ${demand.returnDate}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Durée</dt>
                <dd>{formatDuration(routePreview?.durationMinutes)}</dd>
              </div>
            </dl>

            <div className={styles.manualForm}>
              <div className={styles.manualFields}>
                <label>
                  <span>Départ</span>
                  <input
                    type="text"
                    placeholder="ex: Paris"
                    value={activeDemand.departureCity ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({ ...p, departureCity: e.target.value.trim() ? e.target.value : null }))
                    }
                  />
                </label>
                {multiDestination ? (
                  <label>
                    <span>Ville inter.</span>
                    <input
                      type="text"
                      placeholder="ex: Lyon, Dijon"
                      value={stops.join(", ")}
                      onChange={(e) => setStops(splitValues(e.target.value))}
                    />
                  </label>
                ) : null}
                <label>
                  <span>Arrivée</span>
                  <input
                    type="text"
                    placeholder="ex: Lyon"
                    value={activeDemand.arrivalCity ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({ ...p, arrivalCity: e.target.value.trim() ? e.target.value : null }))
                    }
                  />
                </label>
                <label className={warningFor("departureDate") ? styles.fieldInvalid : undefined}>
                  <span>Date de départ</span>
                  <input
                    type="date"
                    value={activeDemand.departureDate ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({ ...p, departureDate: e.target.value || null }))
                    }
                  />
                  {warningFor("departureDate") ? (
                    <small className={styles.fieldWarning}>{warningFor("departureDate")!.message}</small>
                  ) : null}
                </label>
                <label>
                  <span>Type</span>
                  <select
                    value={multiDestination ? "multi_stop" : activeDemand.tripType ?? ""}
                    onChange={(e) => updateTripType(e.target.value)}
                  >
                    <option value="">--</option>
                    <option value="one_way">Aller simple</option>
                    <option value="round_trip">Aller-retour</option>
                    <option value="multi_stop">Multi-destination / avec escale</option>
                  </select>
                </label>
                {activeDemand.tripType === "round_trip" ? (
                  <label className={warningFor("returnDate") ? styles.fieldInvalid : undefined}>
                    <span>Date de retour facultative</span>
                    <input
                      type="date"
                      value={activeDemand.returnDate ?? ""}
                      onChange={(e) =>
                        setChatExtracted((p) => ({ ...p, returnDate: e.target.value || null }))
                      }
                    />
                    {warningFor("returnDate") ? (
                      <small className={styles.fieldWarning}>{warningFor("returnDate")!.message}</small>
                    ) : null}
                  </label>
                ) : null}
                <label className={warningFor("passengerCount") ? styles.fieldInvalid : undefined}>
                  <span>Passagers</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="ex: 45"
                    value={activeDemand.passengerCount ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setChatExtracted((p) => ({ ...p, passengerCount: raw === "" ? null : Number(raw) }));
                    }}
                  />
                  {warningFor("passengerCount") ? (
                    <small className={styles.fieldWarning}>{warningFor("passengerCount")!.message}</small>
                  ) : null}
                </label>
                <div className={styles.optionsField}>
                  <span className={styles.optionsLabel}>Options</span>
                  <div className={styles.optionTags}>
                    {AVAILABLE_OPTIONS.map((option) => {
                      const active = selectedOptions.includes(option.code);
                      return (
                        <button
                          type="button"
                          key={option.code}
                          className={active ? `${styles.optionTag} ${styles.optionTagOn}` : styles.optionTag}
                          aria-pressed={active}
                          onClick={() => toggleOption(option.code)}
                        >
                          {option.label}
                          <small>{option.hint}</small>
                        </button>
                      );
                    })}
                  </div>
                  {selectedOptions.includes("guide") ? (
                    <label className={styles.optionQtyRow}>
                      <span>Jours de guide</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        placeholder="ex: 2"
                        value={guideDays ?? ""}
                        onChange={(e) => setGuideDays(e.target.value === "" ? null : Number(e.target.value))}
                      />
                      <small>
                        {guideDays && guideDays > 0
                          ? `≈ ${guideDays * GUIDE_DAY_RATE_EUR} € HT`
                          : "à confirmer"}
                      </small>
                    </label>
                  ) : null}
                  {selectedOptions.includes("driver_overnight") ? (
                    <label className={styles.optionQtyRow}>
                      <span>Nuits chauffeur</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        placeholder="ex: 1"
                        value={driverNights ?? ""}
                        onChange={(e) => setDriverNights(e.target.value === "" ? null : Number(e.target.value))}
                      />
                      <small>
                        {driverNights && driverNights > 0
                          ? `≈ ${driverNights * DRIVER_NIGHT_RATE_EUR} € HT`
                          : "à confirmer"}
                      </small>
                    </label>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <details className={`${styles.sidePanel} ${styles.collapsiblePanel}`}>
            <summary className={styles.collapsibleSummary}>
              <span id="contact-panel-title">Vos coordonnées</span>
              <small>
                {chatEmail || activeDemand.phone || activeDemand.contactName
                  ? "Coordonnées renseignées — modifier"
                  : "À compléter avant l'envoi"}
              </small>
            </summary>

            <div className={styles.manualForm}>
              <div className={styles.manualFields}>
                <label>
                  <span>Type de client</span>
                  <select
                    value={activeDemand.clientType ?? ""}
                    onChange={(e) => setChatClientType(e.target.value || null)}
                  >
                    <option value="">--</option>
                    <option value="Particulier">Particulier</option>
                    <option value="Entreprise">Entreprise</option>
                    <option value="Association">Association</option>
                    <option value="Agence">Agence</option>
                    <option value="École">École</option>
                    <option value="Collectivité">Collectivité</option>
                  </select>
                </label>
                <label>
                  <span>Organisation</span>
                  <input
                    type="text"
                    placeholder="ex: Alpha Conseil"
                    value={activeDemand.organization ?? ""}
                    onChange={(e) => setChatOrganization(e.target.value.trim() ? e.target.value : null)}
                  />
                </label>
                <label>
                  <span>Nom du contact</span>
                  <input
                    type="text"
                    placeholder="ex: Marie Dupont"
                    value={activeDemand.contactName ?? ""}
                    onChange={(e) => setChatContactName(e.target.value.trim() ? e.target.value : null)}
                  />
                </label>
                <label>
                  <span>Téléphone</span>
                  <input
                    type="tel"
                    placeholder="ex: 06 12 34 56 78"
                    value={activeDemand.phone ?? ""}
                    onChange={(e) => setChatPhone(e.target.value.trim() ? e.target.value : null)}
                  />
                </label>
                <label className={qualifiedLeadId && !chatEmail && !hasInitialDemand ? styles.fieldInvalid : undefined}>
                  <span>Email de contact {qualifiedLeadId && !hasInitialDemand ? <strong aria-hidden="true"> *</strong> : null}</span>
                  <input
                    type="email"
                    placeholder="votre@email.fr"
                    value={chatEmail ?? ""}
                    onChange={(e) => setChatEmail(e.target.value.trim() || null)}
                  />
                  {qualifiedLeadId && !chatEmail && !hasInitialDemand ? (
                    <small className={styles.fieldWarning}>Requis pour recevoir le devis.</small>
                  ) : null}
                </label>
              </div>
            </div>
          </details>

          {renderQuoteValidationActions(styles.formSubmitActions, { alwaysShowButton: true })}
        </div>
      </div>
    </main>
  );
}
