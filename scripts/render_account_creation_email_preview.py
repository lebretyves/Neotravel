from pathlib import Path


ROOTS = [
    Path(r"E:\Neotravel\_worktrees\last_modif"),
    Path.cwd(),
]

VALUES = {
    "clientName": "Claire Martin",
    "contactName": "Claire Martin",
    "organizationName": "Association scolaire Alpha",
    "quoteReference": "DEV-2026-042",
    "requestReference": "NT-DMD-2406",
    "departureCity": "Paris",
    "arrivalCity": "Lyon",
    "departureDate": "12/07/2026",
    "passengers": "42 passagers",
    "vehicle": "Autocar",
    "totalTTC": "2 640 EUR TTC",
    "validityDays": "7",
    "accountCreationUrl": "https://neotravel-epitech.vercel.app/connexion/inscription?quoteId=DEV-2026-042",
    "accountLoginUrl": "https://neotravel-epitech.vercel.app/connexion?quoteId=DEV-2026-042",
}


def find_template() -> Path:
    for root in ROOTS:
        candidate = root / "src/features/emails/templates/05_creation_compte.html"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("05_creation_compte.html introuvable")


def render(source: str) -> str:
    for key, value in VALUES.items():
        source = source.replace("{{" + key + "}}", value)
    return source


template = find_template()
output = Path("docs/apercu-mail-creation-compte-neotravel.html")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(render(template.read_text(encoding="utf-8")), encoding="utf-8")
print(output.resolve())
