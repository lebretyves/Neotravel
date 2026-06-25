# NeoTravel

Prototype MVP pour démontrer un parcours commercial amont de devis transport.

## Périmètre actuel

- Socle pricing déterministe en TypeScript.
- Socle Supabase minimal : schéma SQL, seeds et variables d'environnement.
- Agent Vercel AI SDK minimal avec tools contrôlés.
- `calculer_devis()` est le seul composant autorisé à produire un prix.
- Pas de front, pas de dashboard, pas de n8n.

## Installation

```bash
npm install
```

Les dépendances sont locales au projet et déclarées dans `package.json`.
Aucune installation globale n'est nécessaire.

## Commandes

```bash
npm test
npm run typecheck
```

Test d'intégration Supabase local :

```bash
supabase start
supabase db reset
set -a; eval "$(supabase status -o env)"; set +a
npm run test:integration
```

`set -a` exporte les variables retournées par `supabase status -o env` pour que
`createServerSupabaseClient()` puisse lire `NEXT_PUBLIC_SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` au moment de l'appel.

Agent IA local :

```bash
export GEMINI_API_KEY=...
export AI_MODEL_ID=gemini-3-flash-preview
export AGENT_DEBUG_LOGS=true
export AGENT_QUALIFICATION_TIMEOUT_MS=15000
npm run dev
```

Le modèle Gemini est appelé via le provider AI SDK `@ai-sdk/google`. Les tools NeoTravel
restent les seuls à créer un lead, résoudre une distance ou calculer un devis.
Les logs `[neotravel:agent]` tracent les phases serveur sans afficher le message complet ni l'email.
`/api/chat` retourne toujours un JSON métier commun : `status`, `message`, puis `leadId`,
`quoteId`, `missingFields` ou `reviewReason` selon le cas.

## Supabase

Avec la CLI Supabase locale et Docker :

```bash
supabase start
supabase db reset
```

La CLI applique les migrations dans `supabase/migrations/`, puis exécute `supabase/seed.sql`.

Avec Supabase Cloud, exécuter manuellement dans l'éditeur SQL :

1. `supabase/schema.sql`
2. `supabase/seed.sql`

## Structure

- `src/lib/domain/status.ts` : statuts du pipeline.
- `src/lib/domain/types.ts` : types métier du pricing.
- `src/lib/domain/schemas.ts` : schémas Zod partagés.
- `src/lib/ai/prompt.ts` : prompt système et garde-fous injection.
- `src/lib/ai/tools.ts` : tools contrôlés exposés à l'agent.
- `src/app/api/chat/route.ts` : route API chat minimale.
- `src/lib/pricing/pricing-rules.ts` : règles tarifaires isolées.
- `src/lib/pricing/calculer-devis.ts` : calcul pur et déterministe.
- `src/lib/pricing/calculer-devis.test.ts` : tests Vitest du pricing.
- `src/lib/pricing/lookup-pricing-rules.ts` : lecture de la matrice active Supabase.
- `src/lib/pricing/resolve-distance.ts` : résolution de distance depuis `route_pricing`.
- `src/lib/quotes/quote-service.ts` : orchestration lead → devis sauvegardé.
- `src/lib/quotes/quote-service.integration.test.ts` : test d'intégration Supabase local.
- `src/lib/leads/lead-service.ts` : lecture lead et transitions de statuts.
- `src/lib/audit/audit-service.ts` : écriture des logs d'audit.
- `docs/prompt-system.md` : contrat du prompt système.
- `docs/golden-set.md` : scénarios de validation agent.
- `supabase/schema.sql` : tables minimales du MVP.
- `supabase/migrations/` : migrations utilisées par la CLI Supabase locale.
- `supabase/seed.sql` : matrice tarifaire v1 et routes de démonstration.
