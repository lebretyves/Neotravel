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
 const aiProvider = env.AI_PROVIDER ?? "mock";
 const aiConnected =
  isSet(aiProvider) &&
  aiProvider !== "mock" &&
  (aiProvider === "vercel-ai-gateway" ? isSet(env.AI_GATEWAY_API_KEY) : isSet(env.OPENAI_API_KEY));
 const n8nConnected = isSet(env.N8N_BASE_URL);
 const mapsConnected = isSet(env.OSRM_BASE_URL) || isSet(env.OPENROUTESERVICE_API_KEY);

 return [
  {
   id: "supabase",
   name: "Base de données (Supabase)",
   description: "Persistance réelle des demandes, devis, clients et journaux d'audit.",
   connected: supabaseConfigured && !demo,
   detail:
    supabaseConfigured && !demo
     ? "Connecte."
     : demo
      ? "Mode demo : donnees en memoire (remises a zero au redemarrage)."
      : "Non configure.",
   fields: withStatus([
    { key: "NEXT_PUBLIC_SUPABASE_URL", label: "URL Supabase", placeholder: "https://xxxx.supabase.co" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Clé anon", secret: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Clé service role", secret: true },
    { key: "NEXT_PUBLIC_DEMO_MODE", label: 'Mode demo (mettre "false" pour activer Supabase)', placeholder: "false" }
   ])
  },
  {
   id: "ai",
   name: "IA (Vercel / Mistral)",
   description: "Extraction et qualification automatiques des demandes par l'agent.",
   connected: aiConnected,
   detail: aiConnected ? `Connecte (${env.AI_MODEL ?? "modele par defaut"}).` : "Mode mock : reponses simulees.",
   fields: withStatus([
    { key: "AI_PROVIDER", label: "Fournisseur", placeholder: "vercel-ai-gateway" },
    { key: "AI_MODEL", label: "Modele", placeholder: "mistral/mistral-small" },
    { key: "AI_GATEWAY_API_KEY", label: "Cle Vercel AI Gateway", secret: true },
    { key: "AI_BASE_URL", label: "URL Gateway", placeholder: "https://ai-gateway.vercel.sh/v1" },
    { key: "OPENAI_API_KEY", label: "Cle OpenAI directe", secret: true }
   ])
  },
  {
   id: "n8n",
   name: "Automatisations (n8n)",
   description: "Envoi des devis, relances et notifications par email.",
   connected: n8nConnected,
   detail: n8nConnected ? "Connecte." : "Non configure : les envois sont simules.",
   fields: withStatus([
    { key: "N8N_BASE_URL", label: "URL n8n", placeholder: "https://n8n.exemple.com" },
    { key: "N8N_WEBHOOK_SECRET", label: "Secret webhook", secret: true },
    { key: "N8N_SEND_QUOTE_WEBHOOK", label: "Webhook envoi devis" },
    { key: "N8N_FOLLOWUP_WEBHOOK", label: "Webhook relances" }
   ])
  },
  {
   id: "maps",
   name: "Cartes & itinéraires (OSRM / OpenRouteService)",
   description: "Calcul d'itinéraire réel (distance) nécessaire au devis automatique.",
   connected: mapsConnected,
   detail: mapsConnected
    ? "Connecte."
    : "Non configure : renseignez l'URL OSRM (service public, sans cle) ou une cle OpenRouteService.",
   optional: true,
   fields: withStatus([
    { key: "OSRM_BASE_URL", label: "URL OSRM", placeholder: "https://router.project-osrm.org" },
    { key: "OPENROUTESERVICE_API_KEY", label: "Clé OpenRouteService", secret: true }
   ])
  }
 ];
}

export const ALLOWED_ENV_KEYS = new Set([
 "NEXT_PUBLIC_SUPABASE_URL",
 "NEXT_PUBLIC_SUPABASE_ANON_KEY",
 "SUPABASE_SERVICE_ROLE_KEY",
 "NEXT_PUBLIC_DEMO_MODE",
 "AI_PROVIDER",
 "AI_MODEL",
 "AI_GATEWAY_API_KEY",
 "AI_BASE_URL",
 "OPENAI_BASE_URL",
 "OPENAI_API_KEY",
 "N8N_BASE_URL",
 "N8N_WEBHOOK_SECRET",
 "N8N_SEND_QUOTE_WEBHOOK",
 "N8N_FOLLOWUP_WEBHOOK",
 "N8N_HUMAN_REVIEW_WEBHOOK",
 "N8N_DAILY_DIGEST_WEBHOOK",
 "OSRM_BASE_URL",
 "OPENROUTESERVICE_API_KEY"
]);
