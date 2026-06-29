import { describe, expect, it } from "vitest";

import { renderCustomerEmailTemplate } from "./emailTemplates";

describe("renderCustomerEmailTemplate", () => {
  it("renders the quote template with escaped dynamic values and subject", () => {
    const result = renderCustomerEmailTemplate("QUOTE_AVAILABLE", {
      clientName: "Client <script>",
      quoteReference: "DEV-001",
      requestReference: "REQ-001",
      departureCity: "Paris",
      arrivalCity: "Lyon",
      departureDate: "12/07/2026",
      passengers: "42 passagers",
      vehicle: "Autocar",
      totalTTC: "3 124 €",
      quoteUrl: "https://example.test/client/devis/quote-1",
      accountCreationUrl: "https://example.test/connexion/inscription?quoteId=quote-1",
      accountLoginUrl: "https://example.test/connexion?quoteId=quote-1",
      validityDays: "7",
    });

    expect(result.templateName).toBe("02_devis_disponible.html");
    expect(result.subject).toBe("Votre devis NeoTravel est disponible");
    expect(result.html).toContain("DEV-001");
    expect(result.html).toContain("https://example.test/connexion/inscription?quoteId=quote-1");
    expect(result.html).toContain("Client &lt;script&gt;");
    expect(result.html).not.toContain("Client <script>");
    expect(result.text).toContain("Votre devis NeoTravel est disponible");
  });

  it("renders the account creation template before quote access", () => {
    const result = renderCustomerEmailTemplate("ACCOUNT_CREATION", {
      clientName: "Client <script>",
      contactName: "Client <script>",
      organizationName: "Neo Bus",
      quoteReference: "DEV-001",
      requestReference: "REQ-001",
      departureCity: "Paris",
      arrivalCity: "Lyon",
      departureDate: "12/07/2026",
      passengers: "42 passagers",
      vehicle: "Autocar",
      totalTTC: "3 124 EUR",
      accountCreationUrl: "https://example.test/connexion/inscription?quoteId=quote-1",
      accountLoginUrl: "https://example.test/connexion?quoteId=quote-1",
      validityDays: "7",
    });

    expect(result.templateName).toBe("05_creation_compte.html");
    expect(result.subject).toBe("Creation de votre compte client NeoTravel");
    expect(result.html).toContain("DEV-001");
    expect(result.html).toContain("Neo Bus");
    expect(result.html).toContain("https://example.test/connexion/inscription?quoteId=quote-1");
    expect(result.html).toContain("Client &lt;script&gt;");
    expect(result.text).toContain("Creer votre compte client");
  });

  it("renders missing lead fields for incomplete demand emails", () => {
    const result = renderCustomerEmailTemplate("DEMAND_INCOMPLETE", {
      clientName: "Camille",
      missingFields: "ville d’arrivée, date de départ",
      requestReference: "REQ-002",
      departureCity: "Paris",
      arrivalCity: "À confirmer",
      departureDate: "À confirmer",
      passengers: "30 passagers",
      tripType: "Aller simple",
      completionUrl: "https://example.test/client/demande?leadId=lead-1",
    });

    expect(result.templateName).toBe("00_demande_incomplete.html");
    expect(result.subject).toBe("Informations necessaires pour finaliser votre demande NeoTravel");
    expect(result.html).toContain("ville d’arrivée, date de départ");
    expect(result.html).toContain("https://example.test/client/demande?leadId=lead-1");
  });
});
