export type EnvFieldStatus = {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
  isSet: boolean;
};

export type IntegrationStatus = {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  detail: string;
  optional?: boolean;
  fields: EnvFieldStatus[];
};

const isSet = (value?: string) => Boolean(value && value.trim().length > 0);

function withStatus(fields: Omit<EnvFieldStatus, "isSet">[]): EnvFieldStatus[] {
  return fields.map((field) => ({ ...field, isSet: isSet(process.env[field.key]) }));
}

/** État de connexion de chaque intégration, lu depuis les variables d'environnement. */
export function getIntegrationsStatus(): IntegrationStatus[] {
  const env = process.env;
  const demo = env.NEXT_PUBLIC_DEMO_MODE === "true";

  const supabaseConfigured =
    isSet(env.NEXT_PUBLIC_SUPABASE_URL) && isSet(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && isSet(env.SUPABASE_SERVICE_ROLE_KEY);
  const aiConnected = isSet(env.AI_GATEWAY_API_KEY) || isSet(env.AI_API_KEY);
  const aiProvider = isSet(env.AI_GATEWAY_API_KEY) ? "Vercel AI Gateway" : isSet(env.AI_API_KEY) ? "OpenRouter" : "mock";
  const n8nConnected = isSet(env.N8N_BASE_URL);

  return [
    {
      id: "supabase",
      name: "Base de données (Supabase)",
      description: "Persistance réelle des demandes, devis, clients et journaux d'audit.",
      connected: supabaseConfigured && !demo,
      detail:
        supabaseConfigured && !demo
          ? "Connecté."
          : demo
            ? "Mode démo : données en mémoire (remises à zéro au redémarrage)."
            : "Non configuré.",
      fields: withStatus([
        { key: "NEXT_PUBLIC_SUPABASE_URL", label: "URL Supabase", placeholder: "https://xxxx.supabase.co" },
        { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Clé anon", secret: true },
        { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Clé service role", secret: true },
        { key: "NEXT_PUBLIC_DEMO_MODE", label: 'Mode démo (mettre "false" pour activer Supabase)', placeholder: "false" }
      ])
    },
    {
      id: "ai",
      name: "IA",
      description: "Extraction et qualification automatiques des demandes par l'agent.",
      connected: aiConnected,
      detail: aiConnected
        ? `Connecté via ${aiProvider} (${env.AI_GATEWAY_MODEL_ID ?? env.AI_MODEL_ID ?? "modèle par défaut"}).`
        : "Non configuré : réponses de secours uniquement.",
      fields: withStatus([
        { key: "AI_GATEWAY_API_KEY", label: "Clé Vercel AI Gateway", secret: true },
        { key: "AI_GATEWAY_MODEL_ID", label: "Modèle Gateway", placeholder: "openai/gpt-5-mini" },
        { key: "AI_API_KEY", label: "Clé OpenRouter", secret: true },
        { key: "AI_MODEL_ID", label: "Modèle OpenRouter", placeholder: "openai/gpt-oss-120b:free" }
      ])
    },
    {
      id: "n8n",
      name: "Automatisations (n8n)",
      description: "Envoi des devis, relances et notifications par email.",
      connected: n8nConnected,
      detail: n8nConnected ? "Connecté." : "Non configuré : les envois sont simulés.",
      fields: withStatus([
        { key: "N8N_BASE_URL", label: "URL n8n", placeholder: "https://n8n.exemple.com" },
        { key: "N8N_WEBHOOK_SECRET", label: "Secret webhook", secret: true },
        { key: "N8N_SEND_QUOTE_WEBHOOK", label: "Webhook envoi devis" },
        { key: "N8N_FOLLOWUP_WEBHOOK", label: "Webhook relances" }
      ])
    },
    {
      id: "maps",
      name: "Cartes & itinéraires (OpenStreetMap / OSRM)",
      description: "Carte du trajet et calcul d'itinéraire réel sur la fiche demande.",
      connected: true,
      detail: "Connecté (service public, aucune clé requise).",
      optional: true,
      fields: []
    }
  ];
}
