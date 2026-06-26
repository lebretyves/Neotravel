import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { defaultLanguage, translations, type LanguageCode } from "@/shared/i18n/translations";
import { getQuoteById } from "./getQuoteById";

const colors = {
  blue: "0.039 0.239 0.561",
  navy: "0.035 0.102 0.208",
  red: "0.800 0.078 0.145",
  gold: "0.890 0.620 0.161",
  text: "0.078 0.110 0.169",
  muted: "0.361 0.420 0.510",
  border: "0.859 0.890 0.941",
  paleBlue: "0.969 0.980 1.000",
  chipBlue: "0.910 0.949 1.000",
  green: "0.020 0.510 0.278",
  paleGreen: "0.898 0.980 0.929",
  white: "1 1 1"
};

const pdfLanguages = ["FR", "EN", "ES", "IT", "PT", "DE"] as const;
type PdfLanguage = (typeof pdfLanguages)[number];

const pdfLegalNotes: Record<PdfLanguage, string> = {
  FR: "Version francaise de reference. Toute traduction est fournie pour information.",
  EN: "Reference French version. This translation is provided for information.",
  ES: "Version francesa de referencia. Esta traduccion se facilita a titulo informativo.",
  IT: "Versione francese di riferimento. Questa traduzione e fornita a titolo informativo.",
  PT: "Versao francesa de referencia. Esta traducao e fornecida a titulo informativo.",
  DE: "Massgeblich ist die franzosische Fassung. Diese Ubersetzung dient nur zur Information."
};

function resolvePdfLanguage(language: string | null | undefined): PdfLanguage {
  if (language && pdfLanguages.includes(language as PdfLanguage)) return language as PdfLanguage;
  return "FR";
}

function translatePdf(source: string, language: PdfLanguage) {
  if (language === defaultLanguage) return source;
  return translations[language as Exclude<LanguageCode, "FR">]?.[source] ?? source;
}

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function euro(value: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)} EUR`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "A confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatTripDates(departureDate: string | null | undefined, returnDate: string | null | undefined) {
  const departure = formatDate(departureDate);
  if (!returnDate) return departure;

  return `${departure} - retour ${formatDate(returnDate)}`;
}

function formatTripType(value: string | null | undefined) {
  if (value === "round_trip") return "Aller-retour";
  if (value === "one_way") return "Aller simple";

  return "A confirmer";
}

function formatTraceabilityDate(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("day")}/${part("month")}/${part("year")} a ${part("hour")}:${part("minute")}`;
}

function traceabilityReference(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return `NTV-${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}`;
}

function pricingEngineLabel(matrixVersion: string) {
  const version = matrixVersion.match(/v\d+/i)?.[0] ?? matrixVersion;
  return `NeoTravel Pricing Engine ${version}`;
}

function rect(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  if (!stroke) return `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;
  return `q ${fill} rg ${stroke} RG 1 w ${x} ${y} ${width} ${height} re B Q`;
}

function text(value: string, x: number, y: number, size = 10, font = "F1", fill = colors.text) {
  return `q ${fill} rg BT /${font} ${size} Tf ${x} ${y} Td (${ascii(value)}) Tj ET Q`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke = colors.border, width = 1) {
  return `q ${stroke} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`;
}

function buildPdf(commands: string[]) {
  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Uint8Array(Buffer.from(chunks.join(""), "utf8"));
}

function field(commands: string[], label: string, value: string, x: number, y: number) {
  commands.push(text(label, x, y, 7, "F2", colors.muted));
  commands.push(text(value, x, y - 14, 9, "F2", colors.text));
}

function pushWrappedText(
  commands: string[],
  value: string,
  x: number,
  y: number,
  options: { fill?: string; font?: string; lineHeight?: number; maxChars?: number; maxLines?: number; size?: number } = {}
) {
  const maxChars = options.maxChars ?? 58;
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      continue;
    }
    current = next;
  }

  if (current) lines.push(current);
  lines.slice(0, options.maxLines ?? 2).forEach((lineText, index) => {
    commands.push(
      text(lineText, x, y - index * (options.lineHeight ?? 9), options.size ?? 7, options.font ?? "F1", options.fill ?? colors.text)
    );
  });
}

export async function generateQuotePdf(quoteId: string, language?: string | null) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;

  const pdfLanguage = resolvePdfLanguage(language);
  const tr = (source: string) => translatePdf(source, pdfLanguage);
  const lead = await getLeadDetail(quote.leadId);
  const calculation = quote.calculation;
  const routeLabel =
    lead?.departureCity && lead?.arrivalCity
      ? `${lead.departureCity} -> ${lead.arrivalCity}`
      : calculation.breakdown.routeLabel;
  const clientName = lead?.organization ?? tr("Client particulier / organisation");
  const clientEmail = lead?.email ?? tr("Email a confirmer");
  const passengerLabel = lead?.passengerCount ? `${lead.passengerCount} ${tr("passagers")}` : tr("A confirmer");
  const tripDates = `${formatTripDates(lead?.departureDate, lead?.returnDate)} - ${tr("horaires a confirmer")}`;
  const tripType = tr(formatTripType(lead?.tripType));
  const options = lead?.options.length ? lead.options : calculation.breakdown.options.map((option) => option.label);
  const generatedAt = new Date();
  const traceabilityDate = formatTraceabilityDate(generatedAt);
  const traceabilityId = traceabilityReference(generatedAt);
  const engineLabel = pricingEngineLabel(calculation.breakdown.matrixVersion);

  const commands: string[] = [
    rect(0, 0, 595, 842, colors.white),
    rect(40, 796, 515, 10, colors.blue),
    rect(40, 796, 132, 10, colors.red),
    rect(172, 796, 72, 10, colors.gold),
    rect(40, 80, 515, 716, colors.white, colors.border),
    text("Neo", 74, 748, 18, "F2", colors.blue),
    text("Travel", 116, 748, 18, "F2", colors.red),
    text(tr("Transport de voyageurs - devis client"), 74, 734, 7, "F1", colors.muted),
    rect(48, 733, 26, 26, colors.red),
    text("N", 57, 742, 12, "F2", colors.white),
    text(tr("Devis").toUpperCase(), 456, 744, 30, "F2", colors.navy),
    text(`No ${calculation.quoteNumber}`, 432, 724, 9, "F2", colors.muted),
    rect(66, 655, 463, 46, colors.paleBlue, colors.border)
  ];

  field(commands, tr("Date emission"), generatedAt.toLocaleDateString("fr-FR"), 82, 682);
  field(commands, tr("Validite offre"), tr("7 jours"), 210, 682);
  field(commands, tr("Statut IA"), tr("Regles metier validees"), 328, 682);
  field(commands, tr("Canal envoi"), "Email", 448, 682);

  commands.push(rect(66, 550, 220, 68, colors.white, colors.border));
  commands.push(text(tr("Emetteur"), 80, 598, 12, "F2", colors.navy));
  commands.push(text("NeoTravel SAS", 80, 581, 9));
  commands.push(text(tr("Transport de voyageurs"), 80, 567, 9));
  commands.push(text("contact@neotravel.fr", 80, 553, 9));

  commands.push(rect(316, 550, 213, 68, colors.white, colors.border));
  commands.push(text(tr("Client"), 330, 598, 12, "F2", colors.navy));
  commands.push(text(clientName, 330, 581, 9));
  commands.push(text(`${tr("Email : ")}${clientEmail}`, 330, 567, 9));
  commands.push(text(`${tr("Reference demande : ")}${quote.leadId}`, 330, 553, 9));

  commands.push(rect(66, 390, 463, 126, colors.paleBlue, colors.border));
  commands.push(text(tr("Prestation demandee"), 80, 494, 13, "F2", colors.navy));
  field(commands, tr("Trajet"), routeLabel, 80, 470);
  field(commands, tr("Date et horaires"), tripDates, 250, 470);
  field(commands, tr("Passagers"), passengerLabel, 425, 470);
  field(commands, tr("Type de trajet"), tripType, 80, 438);
  field(commands, tr("Vehicule"), tr(calculation.breakdown.vehicleLabel), 250, 438);
  field(commands, tr("Distance"), `${calculation.distanceKm} km`, 425, 438);

  const optionLabel = options.length ? options.map((option) => tr(option)).join("   ") : tr("Aucune option ajoutee");
  commands.push(rect(80, 404, Math.min(180, 58 + optionLabel.length * 3.8), 18, colors.chipBlue, colors.border));
  commands.push(text(optionLabel, 92, 410, 8, "F2", colors.blue));

  commands.push(text(tr("Detail estimatif"), 66, 363, 13, "F2", colors.navy));
  commands.push(rect(66, 335, 463, 22, colors.navy));
  commands.push(text(tr("Designation"), 80, 343, 8, "F2", colors.white));
  commands.push(text(tr("Qte"), 310, 343, 8, "F2", colors.white));
  commands.push(text(tr("Prix HT"), 356, 343, 8, "F2", colors.white));
  commands.push(text("TVA", 428, 343, 8, "F2", colors.white));
  commands.push(text(tr("Total TTC"), 474, 343, 8, "F2", colors.white));

  calculation.lines.slice(0, 5).forEach((item, index) => {
    const y = 313 - index * 24;
    commands.push(rect(66, y - 6, 463, 24, index % 2 === 0 ? colors.white : colors.paleBlue));
    commands.push(line(66, y - 6, 529, y - 6));
    commands.push(text(tr(item.label), 80, y + 2, 8));
    commands.push(text("1", 313, y + 2, 8));
    commands.push(text(euro(item.amount), 354, y + 2, 8));
    commands.push(text(`${Math.round(calculation.vatRate * 100)}%`, 428, y + 2, 8));
    commands.push(text(euro(item.amount + item.amount * calculation.vatRate), 466, y + 2, 8, "F2"));
  });

  commands.push(rect(66, 112, 250, 100, colors.paleGreen, "0.722 0.898 0.780"));
  commands.push(text(tr("Traçabilité du devis"), 80, 192, 11, "F2", colors.green));
  commands.push(text(`${tr("Calcul réalisé le : ")}${traceabilityDate}`, 80, 174, 8));
  commands.push(text(`${tr("Moteur : ")}${engineLabel}`, 80, 160, 8));
  commands.push(text(`${tr("Référence : ")}${traceabilityId}`, 80, 146, 8));
  pushWrappedText(commands, tr("Devis généré automatiquement selon les règles métier NeoTravel, sous réserve de validation opérationnelle."), 80, 133, {
    fill: colors.green,
    maxChars: 60,
    maxLines: 2,
    size: 6.5
  });
  pushWrappedText(commands, pdfLegalNotes[pdfLanguage], 80, 116, {
    fill: colors.green,
    maxChars: 60,
    maxLines: 2,
    size: 6.5
  });

  commands.push(rect(340, 112, 189, 100, colors.paleBlue, colors.border));
  commands.push(text(tr("Total HT"), 358, 190, 9, "F2", colors.muted));
  commands.push(text(euro(calculation.priceHt), 450, 190, 9, "F2"));
  commands.push(text(tr("TVA estimee"), 358, 170, 9, "F2", colors.muted));
  commands.push(text(euro(calculation.vatAmount), 450, 170, 9, "F2"));
  commands.push(text(tr("Total TTC"), 358, 146, 12, "F2", colors.navy));
  commands.push(text(euro(calculation.priceTtc), 440, 146, 12, "F2", colors.navy));
  commands.push(text(tr("Montant a confirmer apres disponibilite finale"), 358, 134, 7, "F1", colors.muted));

  commands.push(text(tr("Conditions et acceptation"), 66, 106, 11, "F2", colors.navy));
  commands.push(
    text(
      tr("Offre valable sous reserve de disponibilite partenaires et chauffeur. Le devis devient contractuel apres signature electronique ou accord ecrit du client. Ce document est un devis, pas une facture."),
      66,
      91,
      7,
      "F1",
      colors.text
    )
  );

  return {
    body: buildPdf(commands),
    fileName: `${calculation.quoteNumber}-${pdfLanguage}.pdf`,
    mimeType: "application/pdf"
  };
}
