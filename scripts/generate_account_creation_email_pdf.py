from pathlib import Path


OUTPUT = Path("docs/apercu-mail-creation-compte-neotravel.pdf")


def esc(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text(x: int, y: int, size: int, value: str, font: str = "F1", color: str = "0.12 0.16 0.24") -> str:
    return f"{color} rg BT /{font} {size} Tf {x} {y} Td ({esc(value)}) Tj ET\n"


def center_text(x: int, y: int, width: int, size: int, value: str, font: str = "F1", color: str = "0.12 0.16 0.24") -> str:
    approx_width = len(value) * size * 0.48
    return text(int(x + (width - approx_width) / 2), y, size, value, font, color)


def line(x1: int, y1: int, x2: int, y2: int) -> str:
    return f"0.86 0.89 0.93 RG {x1} {y1} m {x2} {y2} l S\n"


def rect(x: int, y: int, width: int, height: int, color: str) -> str:
    return f"{color} rg {x} {y} {width} {height} re f\n"


def polygon(points: list[tuple[int, int]], color: str) -> str:
    first, *rest = points
    path = f"{color} rg {first[0]} {first[1]} m "
    path += " ".join(f"{x} {y} l" for x, y in rest)
    return path + " h f\n"


def star(cx: int, cy: int, size: int, color: str) -> str:
    return (
        polygon(
            [
                (cx, cy + size),
                (cx + 2, cy + 2),
                (cx + size, cy + 2),
                (cx + 3, cy - 1),
                (cx + 5, cy - size),
                (cx, cy - 4),
                (cx - 5, cy - size),
                (cx - 3, cy - 1),
                (cx - size, cy + 2),
                (cx - 2, cy + 2),
            ],
            color,
        )
    )


def bordered_rect(x: int, y: int, width: int, height: int, fill: str, stroke: str = "0.86 0.89 0.93") -> str:
    return f"{fill} rg {x} {y} {width} {height} re f\n{stroke} RG {x} {y} {width} {height} re S\n"


def neotravel_logo(x: int, y: int) -> str:
    parts = []
    # PDF preview of public/logo-neotravel-v12.svg.
    parts.append(rect(x, y + 6, 56, 56, "0.02 0.11 0.26"))
    parts.append(rect(x, y + 6, 56, 14, "0.84 0.10 0.13"))
    parts.append(polygon([(x + 28, y + 51), (x + 38, y + 40), (x + 34, y + 20), (x + 22, y + 29), (x + 19, y + 43)], "0.94 0.77 0.36"))
    parts.append(polygon([(x + 37, y + 50), (x + 47, y + 45), (x + 39, y + 26), (x + 35, y + 39)], "1 1 1"))
    parts.append(star(x + 12, y + 47, 6, "0.84 0.66 0.23"))
    parts.append(star(x + 24, y + 50, 5, "0.84 0.66 0.23"))
    parts.append(text(x + 70, y + 39, 25, "Neo", "F2", "0.04 0.13 0.28"))
    parts.append(text(x + 142, y + 39, 25, "Travel", "F2", "0.04 0.13 0.28"))
    parts.append(rect(x + 70, y + 20, 62, 4, "0.07 0.22 0.52"))
    parts.append(rect(x + 140, y + 20, 48, 4, "0.84 0.10 0.13"))
    parts.append(rect(x + 196, y + 20, 40, 4, "0.77 0.60 0.26"))
    parts.append(text(x + 71, y + 5, 11, "transport premium groupes", "F2", "0.37 0.42 0.49"))
    return "".join(parts)


def build_pdf() -> bytes:
    content = []
    # Preview intentionally mirrors src/features/emails/templates/00..04:
    # centered 620px-style white card, tri-color top band, logo left, status badge right.
    content.append(rect(0, 0, 595, 842, "0.93 0.95 0.97"))
    content.append(bordered_rect(54, 72, 487, 698, "1 1 1", "0.85 0.89 0.93"))
    content.append(rect(54, 762, 137, 8, "0.84 0.10 0.13"))
    content.append(rect(191, 762, 78, 8, "0.96 0.65 0.14"))
    content.append(rect(269, 762, 272, 8, "0.04 0.31 0.64"))

    content.append(line(78, 704, 517, 704))
    content.append(bordered_rect(78, 720, 170, 34, "0.06 0.09 0.16", "0.06 0.09 0.16"))
    content.append(text(96, 731, 18, "NeoTravel", "F2", "1 1 1"))
    content.append(bordered_rect(424, 727, 86, 22, "0.93 0.96 1.00", "0.75 0.84 0.96"))
    content.append(center_text(424, 734, 86, 9, "Compte client", "F2", "0.04 0.18 0.42"))

    content.append(text(78, 668, 21, "Creer votre compte client", "F2", "0.02 0.11 0.23"))
    content.append(text(78, 637, 11, "Bonjour Claire Martin,", "F1", "0.15 0.19 0.27"))
    content.append(text(78, 611, 11, "Bienvenue dans votre espace NeoTravel. Vous aurez acces a vos demandes,"))
    content.append(text(78, 594, 11, "devis, documents, messages et preferences de contact depuis un espace"))
    content.append(text(78, 577, 11, "client securise."))
    content.append(text(78, 548, 11, "Votre devis NeoTravel est pret. Pour le consulter, vous devez d'abord"))
    content.append(text(78, 531, 11, "creer votre compte client."))

    content.append(bordered_rect(78, 332, 439, 162, "0.97 0.98 1.00", "0.87 0.91 0.95"))
    rows = [
        ("N devis", "DEV-2026-042"),
        ("Reference demande", "NT-DMD-2406"),
        ("Contact", "Claire Martin"),
        ("Organisation", "Association scolaire Alpha"),
        ("Trajet", "Paris -> Lyon"),
        ("Date prevue", "12/07/2026"),
        ("Passagers", "42 passagers"),
        ("Total TTC estime", "2 640 EUR TTC"),
    ]
    y = 468
    for label, value in rows:
        content.append(text(96, y, 10, f"{label} :", "F2", "0.06 0.13 0.25"))
        content.append(text(252, y, 10, value, "F1", "0.06 0.13 0.25"))
        y -= 15

    content.append(rect(181, 280, 233, 36, "0.02 0.11 0.23"))
    content.append(center_text(181, 293, 233, 10, "Creer mon compte et voir mon devis", "F2", "1 1 1"))

    content.append(text(78, 239, 11, "Apres creation du compte, votre devis sera disponible dans l'onglet"))
    content.append(text(78, 222, 11, "Mes devis de votre espace client."))
    content.append(text(78, 193, 11, "Vous avez deja un compte ? Connectez-vous a votre espace client."))

    content.append(text(78, 154, 11, "Bien cordialement,"))
    content.append(text(78, 137, 11, "L'equipe NeoTravel"))
    content.append(rect(54, 72, 487, 48, "0.97 0.98 0.99"))
    content.append(line(54, 120, 541, 120))
    content.append(text(78, 95, 9, "NeoTravel - votre espace client est separe du dashboard interne NeoTravel.", "F1", "0.40 0.44 0.52"))

    stream = "".join(content).encode("cp1252")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"endstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_bytes(build_pdf())
print(OUTPUT.resolve())
