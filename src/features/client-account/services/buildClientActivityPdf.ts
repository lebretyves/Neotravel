const colors = {
  blue: "0.039 0.239 0.561",
  navy: "0.035 0.102 0.208",
  red: "0.800 0.078 0.145",
  gold: "0.890 0.620 0.161",
  text: "0.078 0.110 0.169",
  muted: "0.361 0.420 0.510",
  border: "0.859 0.890 0.941",
  paleBlue: "0.969 0.980 1.000",
  white: "1 1 1"
};

type ActivityExportPayload = {
  exportedAt?: string;
  account?: {
    email?: string | null;
    displayName?: string | null;
    organization?: string | null;
    contactName?: string | null;
    phone?: string | null;
  };
  demands?: Array<Record<string, unknown>>;
  quotes?: Array<Record<string, unknown>>;
  messages?: Array<Record<string, unknown>>;
};

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function text(value: string, x: number, y: number, size = 10, font = "F1", fill = colors.text) {
  return `q ${fill} rg BT /${font} ${size} Tf ${x} ${y} Td (${ascii(value)}) Tj ET Q`;
}

function rect(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  if (!stroke) return `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;
  return `q ${fill} rg ${stroke} RG 1 w ${x} ${y} ${width} ${height} re B Q`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke = colors.border, width = 1) {
  return `q ${stroke} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`;
}

function splitText(value: string, maxChars: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
      continue;
    }
    current = next;
  }

  if (current) lines.push(current);
  return lines;
}

function valueOf(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value);
}

function formatDateTime(value: string | undefined) {
  if (!value) return new Date().toLocaleDateString("fr-FR");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function money(value: unknown, currency: unknown) {
  if (typeof value !== "number") return "-";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)} ${String(currency ?? "EUR")}`;
}

function buildPdf(pages: string[][]) {
  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  const fontStart = 3 + pages.length * 2;

  pages.forEach((commands, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontStart} 0 R /F2 ${fontStart + 1} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
    const content = commands.join("\n");
    contentObjects.push(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
  });

  const pageRefs = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`,
    ...pageObjects.flatMap((page, index) => [page, contentObjects[index]]),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
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

function createPage(pageNumber: number) {
  return [
    rect(0, 0, 595, 842, colors.white),
    rect(40, 796, 515, 10, colors.blue),
    rect(40, 796, 132, 10, colors.red),
    rect(172, 796, 72, 10, colors.gold),
    text("Neo", 58, 754, 18, "F2", colors.blue),
    text("Travel", 100, 754, 18, "F2", colors.red),
    text("Export activite client", 58, 738, 8, "F1", colors.muted),
    text(`Page ${pageNumber}`, 500, 60, 8, "F1", colors.muted)
  ];
}

export function buildClientActivityPdf(payload: ActivityExportPayload) {
  const pages: string[][] = [];
  let page = createPage(1);
  let y = 700;

  function ensureSpace(height = 36) {
    if (y - height >= 84) return;
    pages.push(page);
    page = createPage(pages.length + 1);
    y = 740;
  }

  function heading(label: string) {
    ensureSpace(42);
    page.push(text(label, 58, y, 14, "F2", colors.navy));
    page.push(line(58, y - 8, 536, y - 8));
    y -= 28;
  }

  function paragraph(value: string) {
    for (const row of splitText(value, 92)) {
      ensureSpace(16);
      page.push(text(row, 58, y, 8.5, "F1", colors.text));
      y -= 13;
    }
  }

  function row(label: string, value: string) {
    ensureSpace(18);
    page.push(text(label, 58, y, 8, "F2", colors.muted));
    page.push(text(value, 190, y, 8, "F1", colors.text));
    y -= 15;
  }

  page.push(text("Export d'activite", 348, 748, 26, "F2", colors.navy));
  page.push(text(`Genere le ${formatDateTime(payload.exportedAt)}`, 350, 728, 9, "F1", colors.muted));

  heading("Compte client");
  row("Contact", payload.account?.displayName ?? payload.account?.contactName ?? "-");
  row("Organisation", payload.account?.organization ?? "-");
  row("Email", payload.account?.email ?? "-");
  row("Telephone", payload.account?.phone ?? "-");
  y -= 10;

  if (payload.demands) {
    heading("Demandes");
    if (!payload.demands.length) paragraph("Aucune demande exportee.");
    payload.demands.forEach((demand, index) => {
      ensureSpace(62);
      page.push(rect(52, y - 44, 491, 56, index % 2 === 0 ? colors.paleBlue : colors.white, colors.border));
      page.push(text(`${valueOf(demand, "reference")} - ${valueOf(demand, "status")}`, 66, y, 9, "F2", colors.navy));
      page.push(text(`${valueOf(demand, "departureCity")} -> ${valueOf(demand, "arrivalCity")}`, 66, y - 15, 8));
      page.push(text(`Date: ${valueOf(demand, "departureDate")} | Passagers: ${valueOf(demand, "passengerCount")}`, 66, y - 30, 8));
      y -= 68;
    });
  }

  if (payload.quotes) {
    heading("Devis");
    if (!payload.quotes.length) paragraph("Aucun devis exporte.");
    payload.quotes.forEach((quote, index) => {
      ensureSpace(62);
      page.push(rect(52, y - 44, 491, 56, index % 2 === 0 ? colors.paleBlue : colors.white, colors.border));
      page.push(text(`${valueOf(quote, "reference")} - ${valueOf(quote, "statusLabel")}`, 66, y, 9, "F2", colors.navy));
      page.push(text(valueOf(quote, "route"), 66, y - 15, 8));
      page.push(text(`Total TTC: ${money(quote.priceTtc, quote.currency)} | PDF: ${valueOf(quote, "pdfUrl")}`, 66, y - 30, 8));
      y -= 68;
    });
  }

  if (payload.messages) {
    heading("Messages et activite");
    if (!payload.messages.length) paragraph("Aucun message exporte.");
    payload.messages.forEach((message, index) => {
      ensureSpace(58);
      page.push(rect(52, y - 38, 491, 50, index % 2 === 0 ? colors.paleBlue : colors.white, colors.border));
      page.push(text(`${valueOf(message, "date")} - ${valueOf(message, "subject")}`, 66, y, 8.5, "F2", colors.navy));
      page.push(text(`${valueOf(message, "status")} - ${valueOf(message, "detail")}`, 66, y - 15, 8));
      y -= 62;
    });
  }

  ensureSpace(40);
  paragraph("Cet export regroupe les donnees visibles dans l'espace client NeoTravel. Certaines donnees peuvent etre conservees ou anonymisees selon les obligations legales.");

  pages.push(page);
  return buildPdf(pages);
}
