import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { defaultLanguage, translations, type LanguageCode } from "@/shared/i18n/translations";
import type { QuoteCalculation } from "@/shared/types/quote";
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
const allLanguages = ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"] as const;

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

function resolveRequestedLanguage(language: string | null | undefined): LanguageCode {
  if (language && allLanguages.includes(language as LanguageCode)) return language as LanguageCode;
  return defaultLanguage;
}

function translatePdf(source: string, language: PdfLanguage) {
  if (language === defaultLanguage) return source;
  return translations[language as Exclude<LanguageCode, "FR">]?.[source] ?? source;
}

function translateAny(source: string, language: LanguageCode) {
  if (language === defaultLanguage) return source;
  return translations[language as Exclude<LanguageCode, "FR">]?.[source] ?? source;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function edgeExecutablePath() {
  const candidates = [
    process.env.NEOTRAVEL_PDF_BROWSER,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "msedge"
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => !candidate.includes(":\\") || existsSync(candidate)) ?? candidates[0];
}

function printHtmlToPdf(html: string) {
  return new Promise<Uint8Array | null>(async (resolve) => {
    const dir = path.join(tmpdir(), `neotravel-pdf-${randomUUID()}`);
    const htmlPath = path.join(dir, "quote.html");
    const pdfPath = path.join(dir, "quote.pdf");

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(htmlPath, html, "utf8");

      const browser = spawn(edgeExecutablePath(), [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--disable-extensions",
        `--print-to-pdf=${pdfPath}`,
        `file:///${htmlPath.replace(/\\/g, "/")}`
      ]);

      const timeout = setTimeout(() => {
        browser.kill();
        resolve(null);
      }, 20000);

      browser.on("error", async () => {
        clearTimeout(timeout);
        await rm(dir, { force: true, recursive: true }).catch(() => undefined);
        resolve(null);
      });

      browser.on("exit", async (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          await rm(dir, { force: true, recursive: true }).catch(() => undefined);
          resolve(null);
          return;
        }

        const pdf = await readFile(pdfPath).catch(() => null);
        await rm(dir, { force: true, recursive: true }).catch(() => undefined);
        resolve(pdf ? new Uint8Array(pdf) : null);
      });
    } catch {
      await rm(dir, { force: true, recursive: true }).catch(() => undefined);
      resolve(null);
    }
  });
}

async function generateBrowserPdf(input: {
  calculation: QuoteCalculation;
  clientEmail: string;
  clientName: string;
  engineLabel: string;
  language: LanguageCode;
  optionLabel: string;
  passengerLabel: string;
  quoteId: string;
  routeLabel: string;
  traceabilityDate: string;
  traceabilityId: string;
  tripDates: string;
  tripType: string;
}) {
  const tr = (source: string) => translateAny(source, input.language);
  const direction = input.language === "AR" ? "rtl" : "ltr";
  const align = input.language === "AR" ? "right" : "left";
  const legalNote =
    input.language === "ZH"
      ? "法文版本为参考版本。翻译仅供信息参考。"
      : "النسخة الفرنسية هي النسخة المرجعية. الترجمة مقدمة للمعلومات فقط.";

  const rows = input.calculation.lines
    .slice(0, 5)
    .map(
      (item) => `<tr>
        <td>${escapeHtml(tr(item.label))}</td>
        <td>1</td>
        <td>${escapeHtml(euro(item.amount))}</td>
        <td>${Math.round(input.calculation.vatRate * 100)}%</td>
        <td><strong>${escapeHtml(euro(item.amount + item.amount * input.calculation.vatRate))}</strong></td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="${input.language.toLowerCase()}" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; background: #fff; color: #141c2b; font-family: Arial, "Microsoft YaHei", "Noto Sans CJK SC", Tahoma, sans-serif; direction: ${direction}; text-align: ${align}; }
    .page { width: 210mm; min-height: 297mm; padding: 16mm 14mm; }
    .bars { display: grid; grid-template-columns: 34% 16% 50%; height: 4mm; border-radius: 2mm 2mm 0 0; overflow: hidden; }
    .bars span:nth-child(1) { background: #cc1425; }
    .bars span:nth-child(2) { background: #e39e29; }
    .bars span:nth-child(3) { background: #0a3d8f; }
    .paper { border: 1px solid #dbe3f0; border-top: 0; padding: 14mm 13mm 10mm; }
    .header { display: flex; justify-content: space-between; gap: 18mm; align-items: flex-start; }
    .brand { font-size: 18pt; font-weight: 800; color: #0a3d8f; }
    .brand b { color: #cc1425; }
    .sub { color: #5c6b82; font-size: 7pt; font-weight: 700; }
    .ref { text-align: ${direction === "rtl" ? "left" : "right"}; }
    h1 { margin: 0; color: #091a35; font-size: 28pt; }
    .strip, .trip, .totals { background: #f7faff; border: 1px solid #dbe3f0; border-radius: 8px; }
    .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; margin: 12mm 0; padding: 5mm; }
    .label { color: #5c6b82; display: block; font-size: 7pt; font-weight: 800; margin-bottom: 2mm; }
    strong { color: #141c2b; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-bottom: 9mm; }
    .box { border: 1px solid #dbe3f0; border-radius: 8px; padding: 6mm; min-height: 31mm; }
    h2 { margin: 0 0 5mm; color: #091a35; font-size: 13pt; }
    p { margin: 0 0 2mm; font-size: 9pt; line-height: 1.45; }
    .trip { padding: 6mm; margin-bottom: 8mm; }
    .tripGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm 10mm; }
    .chip { display: inline-flex; margin-top: 5mm; border: 1px solid #dbe3f0; border-radius: 999px; padding: 2mm 6mm; color: #0a3d8f; background: #e8f2ff; font-size: 8pt; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 8pt; }
    th { background: #091a35; color: #fff; text-align: ${align}; padding: 3mm; }
    td { border-bottom: 1px solid #dbe3f0; padding: 3mm; }
    tr:nth-child(even) td { background: #f7faff; }
    .bottom { display: grid; grid-template-columns: 1.35fr .9fr; gap: 10mm; margin-top: 8mm; }
    .trace { background: #e5faed; border: 1px solid #b8e5c7; border-radius: 8px; padding: 5mm 6mm; }
    .trace h3 { margin: 0 0 4mm; color: #058247; }
    .trace p { font-size: 8pt; }
    .totals { padding: 5mm 6mm; }
    .totalLine { display: flex; justify-content: space-between; margin-bottom: 4mm; font-size: 10pt; font-weight: 800; }
    .conditions { border: 1px solid #dbe3f0; border-radius: 8px; padding: 5mm 6mm; margin-top: 8mm; }
  </style>
</head>
<body>
  <main class="page">
    <div class="bars"><span></span><span></span><span></span></div>
    <section class="paper">
      <header class="header">
        <div>
          <div class="brand">Neo <b>Travel</b></div>
          <div class="sub">${escapeHtml(tr("Transport de voyageurs - devis client"))}</div>
        </div>
        <div class="ref">
          <h1>${escapeHtml(tr("Devis").toUpperCase())}</h1>
          <div class="sub">No ${escapeHtml(input.calculation.quoteNumber)}</div>
        </div>
      </header>
      <section class="strip">
        <div><span class="label">${escapeHtml(tr("Date emission"))}</span><strong>${new Date().toLocaleDateString("fr-FR")}</strong></div>
        <div><span class="label">${escapeHtml(tr("Validite offre"))}</span><strong>${escapeHtml(tr("7 jours"))}</strong></div>
        <div><span class="label">${escapeHtml(tr("Statut IA"))}</span><strong>${escapeHtml(tr("Regles metier validees"))}</strong></div>
        <div><span class="label">${escapeHtml(tr("Canal envoi"))}</span><strong>Email</strong></div>
      </section>
      <section class="parties">
        <div class="box"><h2>${escapeHtml(tr("Emetteur"))}</h2><p>NeoTravel SAS</p><p>${escapeHtml(tr("Transport de voyageurs"))}</p><p>contact@neotravel.fr</p></div>
        <div class="box"><h2>${escapeHtml(tr("Client"))}</h2><p>${escapeHtml(input.clientName)}</p><p>${escapeHtml(tr("Email : "))}${escapeHtml(input.clientEmail)}</p><p>${escapeHtml(tr("Reference demande : "))}${escapeHtml(input.quoteId)}</p></div>
      </section>
      <section class="trip">
        <h2>${escapeHtml(tr("Prestation demandee"))}</h2>
        <div class="tripGrid">
          <div><span class="label">${escapeHtml(tr("Trajet"))}</span><strong>${escapeHtml(input.routeLabel)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Date et horaires"))}</span><strong>${escapeHtml(input.tripDates)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Passagers"))}</span><strong>${escapeHtml(input.passengerLabel)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Type de trajet"))}</span><strong>${escapeHtml(input.tripType)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Vehicule"))}</span><strong>${escapeHtml(tr(input.calculation.breakdown.vehicleLabel))}</strong></div>
          <div><span class="label">${escapeHtml(tr("Distance"))}</span><strong>${input.calculation.distanceKm} km</strong></div>
        </div>
        <span class="chip">${escapeHtml(input.optionLabel)}</span>
      </section>
      <h2>${escapeHtml(tr("Detail estimatif"))}</h2>
      <table><thead><tr><th>${escapeHtml(tr("Designation"))}</th><th>${escapeHtml(tr("Qte"))}</th><th>${escapeHtml(tr("Prix HT"))}</th><th>TVA</th><th>${escapeHtml(tr("Total TTC"))}</th></tr></thead><tbody>${rows}</tbody></table>
      <section class="bottom">
        <div class="trace"><h3>${escapeHtml(tr("Traçabilité du devis"))}</h3><p>${escapeHtml(tr("Calcul réalisé le : "))}${escapeHtml(input.traceabilityDate)}</p><p>${escapeHtml(tr("Moteur : "))}${escapeHtml(input.engineLabel)}</p><p>${escapeHtml(tr("Référence : "))}${escapeHtml(input.traceabilityId)}</p><p>${escapeHtml(tr("Devis généré automatiquement selon les règles métier NeoTravel, sous réserve de validation opérationnelle."))}</p><p>${escapeHtml(legalNote)}</p></div>
        <div class="totals"><div class="totalLine"><span>${escapeHtml(tr("Total HT"))}</span><strong>${escapeHtml(euro(input.calculation.priceHt))}</strong></div><div class="totalLine"><span>${escapeHtml(tr("TVA estimee"))}</span><strong>${escapeHtml(euro(input.calculation.vatAmount))}</strong></div><div class="totalLine"><span>${escapeHtml(tr("Total TTC"))}</span><strong>${escapeHtml(euro(input.calculation.priceTtc))}</strong></div><p class="sub">${escapeHtml(tr("Montant a confirmer apres disponibilite finale"))}</p></div>
      </section>
      <section class="conditions"><h2>${escapeHtml(tr("Conditions et acceptation"))}</h2><p>${escapeHtml(tr("Offre valable sous reserve de disponibilite partenaires et chauffeur. Le devis devient contractuel apres signature electronique ou accord ecrit du client. Ce document est un devis, pas une facture."))}</p></section>
    </section>
  </main>
</body>
</html>`;

  const body = await printHtmlToPdf(html);
  if (!body) return null;

  return {
    body,
    fileName: `${input.calculation.quoteNumber}-${input.language}.pdf`,
    mimeType: "application/pdf"
  };
}

export async function generateQuotePdf(quoteId: string, language?: string | null) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;

  const requestedLanguage = resolveRequestedLanguage(language);
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

  if (requestedLanguage === "ZH" || requestedLanguage === "AR") {
    const trAny = (source: string) => translateAny(source, requestedLanguage);
    const browserOptions = options.length ? options.map((option) => trAny(option)).join("   ") : trAny("Aucune option ajoutee");
    const browserPdf = await generateBrowserPdf({
      calculation,
      clientEmail: lead?.email ?? trAny("Email a confirmer"),
      clientName: lead?.organization ?? trAny("Client particulier / organisation"),
      engineLabel,
      language: requestedLanguage,
      optionLabel: browserOptions,
      passengerLabel: lead?.passengerCount ? `${lead.passengerCount} ${trAny("passagers")}` : trAny("A confirmer"),
      quoteId: quote.leadId,
      routeLabel,
      traceabilityDate,
      traceabilityId,
      tripDates: `${formatTripDates(lead?.departureDate, lead?.returnDate)} - ${trAny("horaires a confirmer")}`,
      tripType: trAny(formatTripType(lead?.tripType))
    });

    if (browserPdf) return browserPdf;
  }

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
