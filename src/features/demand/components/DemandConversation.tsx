"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ChatApiResponse, QuoteSummary } from "../../../lib/ai/chat-response";

type Message = {
  role: "user" | "assistant";
  text: string;
};

function buildInitialMessage(params: URLSearchParams): string {
  const departure = params.get("departure") ?? "";
  const arrival = params.get("arrival") ?? "";
  const passengers = params.get("passengers") ?? "";
  const departureDate = params.get("departureDate") ?? "";
  const returnDate = params.get("returnDate") ?? "";
  const tripType = params.get("tripType") ?? "";

  if (!departure && !arrival && !passengers) {
    return "Bonjour, je souhaite obtenir un devis pour un transport de groupe.";
  }

  const parts: string[] = ["Je voudrais reserver un car"];
  if (departure && arrival) parts.push(`de ${departure} a ${arrival}`);
  else if (departure) parts.push(`au depart de ${departure}`);
  else if (arrival) parts.push(`a destination de ${arrival}`);
  if (passengers) parts.push(`pour ${passengers} personnes`);
  if (departureDate) parts.push(`le ${formatDate(departureDate)}`);

  let msg = parts.join(" ") + ".";
  if (tripType === "one_way") msg += " Aller simple.";
  else if (tripType === "round_trip" && returnDate)
    msg += ` Aller-retour, retour le ${formatDate(returnDate)}.`;
  else if (tripType === "round_trip") msg += " Aller-retour.";

  return msg;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

function formatEur(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function DemandConversation() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [leadId, setLeadId] = useState<string | undefined>();
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteSummary | undefined>();
  const [quoteId, setQuoteId] = useState<string | undefined>();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    void sendMessage(buildInitialMessage(searchParams));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(text: string) {
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          ...(leadId ? { leadId } : {}),
        }),
      });
      const data = (await res.json()) as ChatApiResponse;

      setApiStatus(data.status);
      if (data.leadId) setLeadId(data.leadId);
      if (data.quoteId) setQuoteId(data.quoteId);
      if (data.quote) setQuote(data.quote);
      setMessages((prev) => [...prev, { role: "assistant", text: data.message }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Une erreur est survenue. Veuillez reessayer." },
      ]);
      setApiStatus("ERROR");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText("");
    void sendMessage(text);
  }

  const canReply = apiStatus === "INCOMPLETE" || apiStatus === null || apiStatus === "ERROR";

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header style={headerStyle}>
        <Link href="/" style={logoStyle}>NeoTravel</Link>
      </header>

      <main style={mainStyle}>
        <div style={chatContainerStyle}>
          <h1 style={titleStyle}>Votre devis en ligne</h1>

          <div style={messagesStyle} aria-live="polite">
            {messages.length === 0 && loading && (
              <p style={{ color: "#5e6b7e", textAlign: "center", padding: "32px 0", margin: 0 }}>
                Analyse de votre demande en cours…
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={msg.role === "user" ? userMsgStyle : asstMsgStyle}>
                <span style={msg.role === "user" ? userBadgeStyle : asstBadgeStyle}>
                  {msg.role === "user" ? "Vous" : "NeoTravel"}
                </span>
                <p style={{ margin: 0, lineHeight: 1.55 }}>{msg.text}</p>
              </div>
            ))}
            {loading && messages.length > 0 && (
              <div style={asstMsgStyle}>
                <span style={asstBadgeStyle}>NeoTravel</span>
                <p style={{ margin: 0, color: "#5e6b7e" }}>En cours de traitement…</p>
              </div>
            )}
          </div>

          {apiStatus === "QUOTE_READY" && quote && (
            <div style={quoteCardStyle}>
              <p style={{ margin: "0 0 4px", color: "#c49a43", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                Devis #{quote.quoteNumber}
              </p>
              <div style={quotePriceStyle}>
                <span>{formatEur(quote.priceTtc)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#5e6b7e" }}>TTC</span>
              </div>
              <div style={quoteDetailsStyle}>
                {quote.departureCity && quote.arrivalCity && (
                  <span style={detailChipStyle}>{quote.departureCity} → {quote.arrivalCity}</span>
                )}
                {quote.distanceKm && (
                  <span style={detailChipStyle}>{quote.distanceKm} km</span>
                )}
                {quote.vehicleCode && (
                  <span style={detailChipStyle}>{quote.vehicleCode}</span>
                )}
                {quote.passengerCount && (
                  <span style={detailChipStyle}>{quote.passengerCount} passagers</span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e6b7e" }}>
                HT : {formatEur(quote.priceHt)} · TVA 10% : {formatEur(quote.vatAmount)}
              </p>
              {quoteId && (
                <Link href={`/client/devis/${quoteId}`} style={ctaButtonStyle}>
                  Voir le devis complet
                </Link>
              )}
            </div>
          )}

          {canReply && (
            <form onSubmit={handleSubmit} style={formStyle}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  apiStatus === "INCOMPLETE"
                    ? "Completez votre demande…"
                    : "Votre message…"
                }
                style={inputStyle}
                disabled={loading}
                aria-label="Votre message"
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                style={{
                  ...submitStyle,
                  opacity: loading || !inputText.trim() ? 0.5 : 1,
                  cursor: loading || !inputText.trim() ? "not-allowed" : "pointer",
                }}
              >
                Envoyer
              </button>
            </form>
          )}

          {(apiStatus === "HUMAN_REVIEW") && (
            <div style={reviewNoticeStyle}>
              <p style={{ margin: 0, fontSize: 13, color: "#455468" }}>
                Un conseiller NeoTravel va prendre en charge votre demande.{" "}
                <Link href="/" style={{ color: "#123885", fontWeight: 700 }}>
                  Retour a l&apos;accueil
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  minHeight: 64,
  padding: "0 clamp(22px, 4vw, 58px)",
  background: "rgba(255,255,255,0.96)",
  borderBottom: "1px solid #e6edf6",
  position: "sticky",
  top: 0,
  zIndex: 20,
};
const logoStyle: React.CSSProperties = {
  color: "#0d2248",
  fontSize: 22,
  fontWeight: 900,
  textDecoration: "none",
};
const mainStyle: React.CSSProperties = {
  width: "min(720px, calc(100% - 44px))",
  margin: "0 auto",
  padding: "40px 0 80px",
};
const chatContainerStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};
const titleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#071b40",
  fontSize: "clamp(28px, 3vw, 38px)",
  lineHeight: 1.05,
};
const messagesStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};
const userMsgStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "14px 18px",
  background: "#edf2ff",
  borderRadius: 8,
  border: "1px solid #c7d7f8",
};
const asstMsgStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "14px 18px",
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #d7e0ed",
};
const userBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#123885",
  textTransform: "uppercase",
};
const asstBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#c49a43",
  textTransform: "uppercase",
};
const quoteCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "22px",
  background: "#ffffff",
  border: "1px solid #d7e0ed",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
};
const quotePriceStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  fontSize: 36,
  fontWeight: 900,
  color: "#071b40",
};
const quoteDetailsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};
const detailChipStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  background: "#f0f4ff",
  border: "1px solid #dbe4ff",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  color: "#334155",
};
const ctaButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  minHeight: 44,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  padding: "0 18px",
  background: "#d71920",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 900,
  textDecoration: "none",
  marginTop: 4,
  justifySelf: "start" as const,
};
const formStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
};
const inputStyle: React.CSSProperties = {
  minHeight: 48,
  border: "1px solid #cfd8e6",
  borderRadius: 8,
  padding: "0 14px",
  color: "#172033",
  background: "#ffffff",
  font: "inherit",
  fontSize: 15,
  outline: "none",
};
const submitStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "0 20px",
  border: 0,
  borderRadius: 8,
  background: "#123885",
  color: "#ffffff",
  font: "inherit",
  fontSize: 14,
  fontWeight: 900,
};
const reviewNoticeStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 8,
};
