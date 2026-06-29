export type PartnerStatus = "A confirmer" | "Option posee" | "Confirme par commercial" | "Indisponible";

export type Partner = {
  id: string;
  name: string;
  zones: string[];
  capacity: string;
  internalScore: number;
  status: PartnerStatus;
  note: string;
  agenda: Array<{
    date: string;
    status: string;
  }>;
};

export const partnerStatuses: PartnerStatus[] = [
  "A confirmer",
  "Option posee",
  "Confirme par commercial",
  "Indisponible"
];

export const partnerStatusLabels: Record<PartnerStatus, string> = {
  "A confirmer": "À confirmer",
  "Option posee": "Option posée",
  "Confirme par commercial": "Confirmé par commercial",
  Indisponible: "Indisponible"
};

export function formatPartnerStatus(status: PartnerStatus | string) {
  return partnerStatusLabels[status as PartnerStatus] ?? status;
}

export const partners: Partner[] = [
  {
    id: "atlas-cars",
    name: "Atlas Cars Groupe",
    zones: ["Île-de-France", "Auvergne-Rhône-Alpes"],
    capacity: "19 à 63 passagers",
    internalScore: 86,
    status: "Option posee",
    note: "Bon historique sur trajets associatifs. Validation commerciale requise avant engagement.",
    agenda: [
      { date: "15/07/2026", status: "Option commerciale en attente" },
      { date: "16/07/2026", status: "Capacité indicative à confirmer" }
    ]
  },
  {
    id: "hexagone-tourisme",
    name: "Hexagone Tourisme",
    zones: ["Hauts-de-France", "Normandie", "Île-de-France"],
    capacity: "35 à 85 passagers",
    internalScore: 78,
    status: "A confirmer",
    note: "Partenaire pertinent pour forte capacité. Aucune confirmation automatique.",
    agenda: [
      { date: "15/07/2026", status: "Demande à vérifier" },
      { date: "17/07/2026", status: "Retour partenaire attendu" }
    ]
  },
  {
    id: "sud-mobilite",
    name: "Sud Mobilité Autocars",
    zones: ["Occitanie", "Provence-Alpes-Côte d'Azur"],
    capacity: "20 à 53 passagers",
    internalScore: 72,
    status: "Indisponible",
    note: "Non retenu pour ce dossier. Information commerciale à revalider si le trajet change.",
    agenda: [
      { date: "15/07/2026", status: "Non retenu sur ce dossier" },
      { date: "18/07/2026", status: "Autre demande prioritaire" }
    ]
  },
  {
    id: "loire-voyages",
    name: "Loire Voyages",
    zones: ["Pays de la Loire", "Nouvelle-Aquitaine"],
    capacity: "19 à 53 passagers",
    internalScore: 81,
    status: "Confirme par commercial",
    note: "Statut issu d'une action humaine déjà validée sur un dossier de démonstration.",
    agenda: [
      { date: "15/07/2026", status: "Validation commerciale enregistrée" },
      { date: "16/07/2026", status: "Suivi commercial programmé" }
    ]
  }
];

export function getPartnerById(id?: string) {
  return partners.find((partner) => partner.id === id) ?? null;
}
