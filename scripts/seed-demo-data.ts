/**
 * Idempotent demo seed for the NeoTravel pipeline dashboard.
 *
 * Inserts a coherent, realistic dataset across clients / leads / quotes / followups /
 * audit_logs so every dashboard surface shows REAL Supabase rows (no mock). Safe to run
 * multiple times: every row uses a fixed UUID and is upserted on its primary key.
 *
 * Run:  set -a && source .env.local && set +a && npx tsx scripts/seed-demo-data.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Stable ids (so re-runs upsert instead of duplicating)
const C = { lycee: "11111111-0000-4000-8000-000000000001", club: "11111111-0000-4000-8000-000000000002", techcorp: "11111111-0000-4000-8000-000000000003", mairie: "11111111-0000-4000-8000-000000000004" };
const L = (n: number) => `22222222-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const Q = (n: number) => `33333333-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const F = (n: number) => `44444444-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const A = (n: number) => `55555555-0000-4000-8000-${String(n).padStart(12, "0")}`;

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const dateFromNow = (d: number) => daysFromNow(d).slice(0, 10);
const hash = (s: string) => (s + "0".repeat(64)).slice(0, 64);

function calc(quoteNumber: string, priceHt: number, distanceKm: number) {
  const vat = Math.round(priceHt * 0.1);
  return {
    quoteNumber,
    priceHt,
    vatRate: 0.1,
    vatAmount: vat,
    priceTtc: priceHt + vat,
    distanceKm,
    deterministicHash: hash(quoteNumber),
    breakdown: { routeLabel: quoteNumber, vehicleCode: "coach_50", vehicleLabel: "Autocar 50 places", matrixVersion: "v12" },
    lines: [{ label: "Base trajet", amount: priceHt }],
  };
}

async function up(table: string, rows: Record<string, unknown>[]) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

async function main() {
  console.log("Seeding NeoTravel demo data →", url);

  await up("clients", [
    { id: C.lycee, organization: "Lycée Victor Hugo", name: "Marie Lefebvre", email: "sorties@lycee-vhugo.fr", contact_name: "Marie Lefebvre", phone: "+33 1 45 67 89 01", active: true },
    { id: C.club, organization: "Club Olympique Lyonnais Jeunes", name: "Karim Benali", email: "deplacements@col-jeunes.fr", contact_name: "Karim Benali", phone: "+33 4 72 10 20 30", active: true },
    { id: C.techcorp, organization: "TechCorp Séminaires", name: "Sophie Durand", email: "events@techcorp.io", contact_name: "Sophie Durand", phone: "+33 1 80 90 70 60", active: true },
    { id: C.mairie, organization: "Mairie de Saint-Étienne", name: "Paul Mercier", email: "culture@saint-etienne.fr", contact_name: "Paul Mercier", phone: "+33 4 77 48 77 48", active: true },
  ]);

  // Leads across the whole pipeline
  const leads = [
    { id: L(1), client_id: null, status: "NEW", departure_city: "Paris", arrival_city: "Lille", departure_date: dateFromNow(40), passenger_count: 48, trip_type: "one_way", free_message: "Bonjour, sortie scolaire à organiser de Paris vers Lille.", missing_fields: [], options: {}, created_at: daysFromNow(-1), updated_at: daysFromNow(-1) },
    { id: L(2), client_id: C.lycee, status: "INCOMPLETE", departure_city: "Paris", arrival_city: "Strasbourg", departure_date: dateFromNow(55), passenger_count: null, trip_type: "round_trip", free_message: "Voyage de classe Paris-Strasbourg, aller-retour.", missing_fields: ["passenger_count"], options: {}, created_at: daysFromNow(-2), updated_at: daysFromNow(-2) },
    { id: L(3), client_id: C.club, status: "QUALIFIED", departure_city: "Lyon", arrival_city: "Marseille", departure_date: dateFromNow(30), passenger_count: 52, trip_type: "round_trip", return_date: dateFromNow(31), free_message: "Déplacement équipe U18 Lyon-Marseille.", missing_fields: [], options: {}, created_at: daysFromNow(-3), updated_at: daysFromNow(-2) },
    { id: L(4), client_id: C.techcorp, status: "QUOTE_READY", departure_city: "Paris", arrival_city: "Lyon", departure_date: dateFromNow(25), passenger_count: 45, trip_type: "round_trip", return_date: dateFromNow(27), free_message: "Séminaire entreprise Paris-Lyon.", missing_fields: [], options: { tollsIncluded: true }, created_at: daysFromNow(-5), updated_at: daysFromNow(-4) },
    { id: L(5), client_id: C.mairie, status: "QUOTE_SENT", departure_city: "Saint-Étienne", arrival_city: "Paris", departure_date: dateFromNow(20), passenger_count: 60, trip_type: "round_trip", return_date: dateFromNow(22), free_message: "Sortie culturelle Saint-Étienne-Paris.", missing_fields: [], options: {}, created_at: daysFromNow(-8), updated_at: daysFromNow(-6) },
    { id: L(6), client_id: C.club, status: "HUMAN_REVIEW", departure_city: "Lyon", arrival_city: "Bordeaux", departure_date: dateFromNow(15), passenger_count: 95, trip_type: "one_way", human_review_reason: "PAX_OVER_85", free_message: "Tournoi régional, 95 supporters Lyon-Bordeaux.", missing_fields: [], options: {}, created_at: daysFromNow(-4), updated_at: daysFromNow(-4) },
    { id: L(7), client_id: C.lycee, status: "WON", departure_city: "Paris", arrival_city: "Nantes", departure_date: dateFromNow(35), passenger_count: 50, trip_type: "round_trip", return_date: dateFromNow(37), free_message: "Voyage pédagogique Paris-Nantes.", missing_fields: [], options: {}, created_at: daysFromNow(-12), updated_at: daysFromNow(-7) },
    { id: L(8), client_id: C.techcorp, status: "LOST", departure_city: "Paris", arrival_city: "Bordeaux", departure_date: dateFromNow(18), passenger_count: 40, trip_type: "one_way", free_message: "Transfert collaborateurs Paris-Bordeaux.", missing_fields: [], options: {}, created_at: daysFromNow(-10), updated_at: daysFromNow(-6) },
  ];
  await up("leads", leads);

  // Quotes for the leads that reached pricing
  await up("quotes", [
    { id: Q(4), lead_id: L(4), quote_number: "NT-2026-0004", distance_km: 465, distance_source: "seed", price_ht: 2900, vat_rate: 0.1, tva_10pct: 290, vat_amount: 290, price_ttc: 3190, currency: "EUR", status: "QUOTE_READY", deterministic_hash: hash("NT-2026-0004"), matrices_version: "v12", breakdown: { vehicle_code: "coach_50" }, calculation: calc("NT-2026-0004", 2900, 465), created_at: daysFromNow(-4) },
    { id: Q(5), lead_id: L(5), quote_number: "NT-2026-0005", distance_km: 520, distance_source: "seed", price_ht: 3400, vat_rate: 0.1, tva_10pct: 340, vat_amount: 340, price_ttc: 3740, currency: "EUR", status: "QUOTE_SENT", deterministic_hash: hash("NT-2026-0005"), matrices_version: "v12", breakdown: { vehicle_code: "coach_60" }, calculation: calc("NT-2026-0005", 3400, 520), created_at: daysFromNow(-6) },
    { id: Q(7), lead_id: L(7), quote_number: "NT-2026-0007", distance_km: 385, distance_source: "seed", price_ht: 2450, vat_rate: 0.1, tva_10pct: 245, vat_amount: 245, price_ttc: 2695, currency: "EUR", status: "CLOSED", deterministic_hash: hash("NT-2026-0007"), matrices_version: "v12", breakdown: { vehicle_code: "coach_50" }, calculation: calc("NT-2026-0007", 2450, 385), created_at: daysFromNow(-7) },
    { id: Q(8), lead_id: L(8), quote_number: "NT-2026-0008", distance_km: 580, distance_source: "seed", price_ht: 3800, vat_rate: 0.1, tva_10pct: 380, vat_amount: 380, price_ttc: 4180, currency: "EUR", status: "CLOSED", deterministic_hash: hash("NT-2026-0008"), matrices_version: "v12", breakdown: { vehicle_code: "coach_60" }, calculation: calc("NT-2026-0008", 3800, 580), created_at: daysFromNow(-6) },
  ]);

  // Followups for the sent quote
  await up("followups", [
    { id: F(1), lead_id: L(5), quote_id: Q(5), scheduled_at: daysFromNow(3), channel: "email", status: "scheduled", created_at: daysFromNow(-6) },
    { id: F(2), lead_id: L(5), quote_id: Q(5), scheduled_at: daysFromNow(7), channel: "email", status: "scheduled", created_at: daysFromNow(-6) },
    { id: F(3), lead_id: L(7), quote_id: Q(7), scheduled_at: daysFromNow(-5), channel: "email", status: "sent", created_at: daysFromNow(-10) },
  ]);

  // Audit journeys (the parcours)
  await up("audit_logs", [
    { id: A(1), entity_type: "lead", entity_id: L(4), action: "LEAD_CREATED", metadata: { status: "NEW" }, created_at: daysFromNow(-5) },
    { id: A(2), entity_type: "lead", entity_id: L(4), action: "LEAD_QUALIFIED", metadata: { status: "QUALIFIED" }, created_at: daysFromNow(-4.5) },
    { id: A(3), entity_type: "quote", entity_id: Q(4), action: "QUOTE_CREATED", metadata: { leadId: L(4), quoteNumber: "NT-2026-0004" }, created_at: daysFromNow(-4) },
    { id: A(4), entity_type: "lead", entity_id: L(5), action: "LEAD_CREATED", metadata: { status: "NEW" }, created_at: daysFromNow(-8) },
    { id: A(5), entity_type: "quote", entity_id: Q(5), action: "QUOTE_CREATED", metadata: { leadId: L(5), quoteNumber: "NT-2026-0005" }, created_at: daysFromNow(-6.5) },
    { id: A(6), entity_type: "quote", entity_id: Q(5), action: "QUOTE_SENT", metadata: { leadId: L(5) }, created_at: daysFromNow(-6) },
    { id: A(7), entity_type: "followup", entity_id: F(1), action: "FOLLOWUP_SCHEDULED", metadata: { leadId: L(5), dueAt: daysFromNow(3) }, created_at: daysFromNow(-6) },
    { id: A(8), entity_type: "lead", entity_id: L(6), action: "LEAD_MARKED_HUMAN_REVIEW", metadata: { reason: "PAX_OVER_85" }, created_at: daysFromNow(-4) },
    { id: A(9), entity_type: "lead", entity_id: L(7), action: "LEAD_CREATED", metadata: { status: "NEW" }, created_at: daysFromNow(-12) },
    { id: A(10), entity_type: "quote", entity_id: Q(7), action: "QUOTE_CREATED", metadata: { leadId: L(7), quoteNumber: "NT-2026-0007" }, created_at: daysFromNow(-7) },
    { id: A(11), entity_type: "quote", entity_id: Q(7), action: "QUOTE_ACCEPTED", metadata: { leadId: L(7) }, created_at: daysFromNow(-6.5) },
    { id: A(12), entity_type: "lead", entity_id: L(7), action: "LEAD_STATUS_UPDATED", metadata: { status: "WON" }, created_at: daysFromNow(-6.5) },
    { id: A(13), entity_type: "quote", entity_id: Q(8), action: "QUOTE_REFUSED", metadata: { leadId: L(8) }, created_at: daysFromNow(-6) },
    { id: A(14), entity_type: "lead", entity_id: L(8), action: "LEAD_STATUS_UPDATED", metadata: { status: "LOST" }, created_at: daysFromNow(-6) },
    { id: A(15), entity_type: "lead", entity_id: L(2), action: "LEAD_MARKED_INCOMPLETE", metadata: { missingFields: ["passenger_count"] }, created_at: daysFromNow(-2) },
  ]);

  console.log("✓ Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
