export type RgpdStatus = "OK" | "A verifier" | "Alerte";
export type RgpdSeverity = "Faible" | "Moyen" | "Eleve" | "Critique";

export type RgpdDataInventoryItem = {
  data: string;
  usage: string;
  purpose: string;
  sensitivity: "Personnel" | "Operationnel" | "Non sensible" | "Technique" | "Potentiellement sensible";
  visibleBy: string;
  status: "Necessaire" | "A limiter" | "Technique";
};

export type RgpdRetentionItem = {
  dataType: string;
  duration: string;
  justification: string;
  plannedAction: string;
  status: "Defini" | "A definir" | "A verifier";
};

export type RgpdProcessorItem = {
  service: string;
  role: string;
  dataShared: string;
  frontendCall: "Oui" | "Non";
  serverSecret: "Oui" | "Non" | "A verifier";
  risk: RgpdSeverity;
  status: string;
};

export type RgpdSecurityCheck = {
  control: string;
  status: RgpdStatus;
  severity: RgpdSeverity;
  recommendation: string;
};

export const rgpdDataInventory: RgpdDataInventoryItem[] = [
  {
    data: "Email client",
    usage: "Devis et relance",
    purpose: "Suivi commercial",
    sensitivity: "Personnel",
    visibleBy: "Equipe autorisee",
    status: "Necessaire"
  },
  {
    data: "Telephone",
    usage: "Contact client",
    purpose: "Suivi de la demande",
    sensitivity: "Personnel",
    visibleBy: "Equipe autorisee",
    status: "Necessaire"
  },
  {
    data: "Depart / arrivee",
    usage: "Calcul et organisation du transport",
    purpose: "Traitement de la demande",
    sensitivity: "Operationnel",
    visibleBy: "Equipe / partenaire si besoin",
    status: "Necessaire"
  },
  {
    data: "Dates / horaires",
    usage: "Planification",
    purpose: "Organisation du transport",
    sensitivity: "Operationnel",
    visibleBy: "Equipe / partenaire",
    status: "Necessaire"
  },
  {
    data: "Nombre de passagers",
    usage: "Calcul tarifaire",
    purpose: "Generation du devis",
    sensitivity: "Non sensible",
    visibleBy: "Equipe",
    status: "Necessaire"
  },
  {
    data: "Contraintes specifiques",
    usage: "Qualification",
    purpose: "Adaptation de l'offre",
    sensitivity: "Potentiellement sensible",
    visibleBy: "Equipe autorisee",
    status: "A limiter"
  },
  {
    data: "Reference devis",
    usage: "Suivi commercial",
    purpose: "Tracabilite",
    sensitivity: "Non sensible",
    visibleBy: "Equipe / client",
    status: "Necessaire"
  },
  {
    data: "Statut devis",
    usage: "Relance et conversion",
    purpose: "Suivi commercial",
    sensitivity: "Non sensible",
    visibleBy: "Equipe",
    status: "Necessaire"
  },
  {
    data: "Empreinte hash",
    usage: "Preuve d'integrite",
    purpose: "Audit",
    sensitivity: "Technique",
    visibleBy: "Equipe admin",
    status: "Technique"
  }
];

export const rgpdRetention: RgpdRetentionItem[] = [
  {
    dataType: "Lead non converti",
    duration: "Duree limitee",
    justification: "Suivi commercial raisonnable",
    plannedAction: "Suppression ou anonymisation",
    status: "A definir"
  },
  {
    dataType: "Devis accepte",
    duration: "Duree commerciale/comptable",
    justification: "Preuve de prestation",
    plannedAction: "Conservation controlee",
    status: "Defini"
  },
  {
    dataType: "Logs d'audit",
    duration: "Conservation longue",
    justification: "Preuve d'integrite",
    plannedAction: "Archivage",
    status: "Defini"
  },
  {
    dataType: "Payload n8n",
    duration: "Court terme",
    justification: "Automatisation technique",
    plannedAction: "Nettoyage / minimisation",
    status: "Defini"
  },
  {
    dataType: "Email prospect",
    duration: "Duree limitee",
    justification: "Relance commerciale",
    plannedAction: "Suppression si inactif",
    status: "A definir"
  },
  {
    dataType: "PDF devis",
    duration: "Duree liee au devis",
    justification: "Preuve commerciale",
    plannedAction: "Acces securise",
    status: "A verifier"
  }
];

export const rgpdProcessors: RgpdProcessorItem[] = [
  {
    service: "Brevo",
    role: "Envoi email transactionnel",
    dataShared: "Email client, reference devis, lien/PDF",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Moyen",
    status: "Conforme si cote serveur"
  },
  {
    service: "n8n",
    role: "Automatisation relances / notifications",
    dataShared: "Reference devis, email, statut, dates relance",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Moyen",
    status: "Conforme si webhook protege"
  },
  {
    service: "Base de donnees",
    role: "Stockage metier",
    dataShared: "Leads, clients, devis, logs",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Eleve",
    status: "A proteger"
  },
  {
    service: "Hebergement",
    role: "Execution application",
    dataShared: "Donnees applicatives necessaires",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Moyen",
    status: "A verifier"
  },
  {
    service: "Stockage PDF",
    role: "Stockage devis PDF",
    dataShared: "PDF devis",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Eleve",
    status: "Doit etre prive ou signe"
  }
];
