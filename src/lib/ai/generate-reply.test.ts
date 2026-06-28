import { describe, expect, it, vi } from "vitest";

import { buildReplyPrompt, generateAssistantReply, type ReplyContext } from "./generate-reply";

const baseCtx: ReplyContext = {
  status: "INCOMPLETE",
  collected: { departure_city: "Paris" },
  missingFields: ["arrival_city", "departure_date"],
  warnings: [],
  conversation: [
    { role: "assistant", content: "Quelle est votre ville de départ ?" },
    { role: "user", content: "Paris" },
  ],
};

describe("buildReplyPrompt", () => {
  it("includes collected state, missing fields and the transcript", () => {
    const prompt = buildReplyPrompt(baseCtx);
    expect(prompt).toContain("ville de départ = Paris");
    expect(prompt).toContain("ville d'arrivée");
    expect(prompt).toContain("Client : Paris");
  });

  it("forbids inventing prices and distances", () => {
    const prompt = buildReplyPrompt(baseCtx);
    expect(prompt).toMatch(/jamais.*prix/i);
    expect(prompt).toContain("distance");
  });

  it("asks only the first missing field for INCOMPLETE", () => {
    const prompt = buildReplyPrompt(baseCtx);
    expect(prompt).toContain('UNIQUEMENT la première information manquante : "ville d\'arrivée"');
  });

  it("invites to the quote button when QUALIFIED", () => {
    const prompt = buildReplyPrompt({ ...baseCtx, status: "QUALIFIED", missingFields: [] });
    expect(prompt).toContain("Recevoir mon devis");
  });

  it("instructs the model from the generic last-turn signal", () => {
    const prompt = buildReplyPrompt({ ...baseCtx, lastTurnAddedUsableInfo: false });
    expect(prompt).toContain("Le dernier message client n'a ajouté aucune information exploitable");
    expect(prompt).toContain("ne remercie pas pour des précisions inexistantes");
  });
});

describe("generateAssistantReply", () => {
  it("returns the model reply when generation succeeds", async () => {
    const generate = vi.fn().mockResolvedValue("C'est noté pour Paris. Quelle est votre ville d'arrivée ?");
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("C'est noté pour Paris. Quelle est votre ville d'arrivée ?");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("strips wrapping quotes the model may add", async () => {
    const generate = vi.fn().mockResolvedValue('"Quelle est votre ville d\'arrivée ?"');
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("falls back to the deterministic template on failure", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("timeout"));
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("falls back when the model returns an empty string", async () => {
    const generate = vi.fn().mockResolvedValue("   ");
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("uses the provided fallback string when given", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("down"));
    const reply = await generateAssistantReply(
      { ...baseCtx, status: "QUALIFIED", missingFields: [] },
      { generate, fallback: "Demande prête, cliquez sur Recevoir mon devis." },
    );
    expect(reply).toBe("Demande prête, cliquez sur Recevoir mon devis.");
  });

  it("uses deterministic wording when the last turn added no usable date", async () => {
    const generate = vi.fn().mockResolvedValue("Merci pour ces précisions. Pouvez-vous m'indiquer la date de départ souhaitée ?");
    const reply = await generateAssistantReply(
      {
        status: "INCOMPLETE",
        collected: { departure_city: "Paris", arrival_city: "Montpellier" },
        missingFields: ["departure_date", "passenger_count"],
        warnings: [],
        conversation: [
          { role: "assistant", content: "Pouvez-vous me préciser la date de départ souhaitée ?" },
          { role: "user", content: "message sans nouvelle information exploitable" },
        ],
        lastTurnAddedUsableInfo: false,
      },
      { generate },
    );

    expect(reply).toBe(
      "Je n’ai pas encore la date de départ. Elle peut être approximative pour commencer, mais il m’en faut une pour préparer le devis.",
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("uses deterministic wording when the last turn added no usable passenger count", async () => {
    const generate = vi.fn().mockResolvedValue("Combien de passagers ?");
    const reply = await generateAssistantReply(
      {
        status: "INCOMPLETE",
        collected: { departure_city: "Paris", arrival_city: "Montpellier", departure_date: "2027-07-11" },
        missingFields: ["passenger_count"],
        warnings: [],
        conversation: [
          { role: "assistant", content: "Combien de passagers seront à bord ?" },
          { role: "user", content: "message sans nouvelle information exploitable" },
        ],
        lastTurnAddedUsableInfo: false,
      },
      { generate },
    );

    expect(reply).toBe("Je n’ai pas encore le nombre de passagers. Un ordre de grandeur suffit pour avancer.");
    expect(generate).not.toHaveBeenCalled();
  });

  it("uses a natural article for missing departure city", async () => {
    const generate = vi.fn().mockResolvedValue("Quelle est votre ville de départ ?");
    const reply = await generateAssistantReply(
      {
        status: "INCOMPLETE",
        collected: {},
        missingFields: ["departure_city"],
        warnings: [],
        conversation: [{ role: "user", content: "salut" }],
        lastTurnAddedUsableInfo: false,
      },
      { generate },
    );

    expect(reply).toBe("Je n’ai pas encore la ville de départ. Quelle est votre ville de départ ?");
    expect(generate).not.toHaveBeenCalled();
  });

  it("still calls the model when the latest turn added usable info", async () => {
    const generate = vi.fn().mockResolvedValue("C'est noté pour Montpellier. À quelle date souhaitez-vous partir ?");
    const reply = await generateAssistantReply(
      {
        ...baseCtx,
        collected: { departure_city: "Paris", arrival_city: "Montpellier" },
        missingFields: ["departure_date"],
        lastTurnAddedUsableInfo: true,
      },
      { generate },
    );

    expect(reply).toBe("C'est noté pour Montpellier. À quelle date souhaitez-vous partir ?");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("does not let the model conclude while trip type is still missing", async () => {
    const generate = vi.fn().mockResolvedValue("Toutes les informations sont réunies. Cliquez sur Recevoir mon devis.");
    const reply = await generateAssistantReply(
      {
        status: "INCOMPLETE",
        collected: {
          departure_city: "Paris",
          arrival_city: "Lyon",
          departure_date: "2026-07-11",
          passenger_count: 30,
        },
        missingFields: ["trip_type"],
        warnings: [],
        conversation: [
          { role: "assistant", content: "À quelle date souhaitez-vous partir ?" },
          { role: "user", content: "le 11 juillet" },
        ],
        lastTurnAddedUsableInfo: true,
      },
      { generate },
    );

    expect(reply).toBe("C’est noté. Souhaitez-vous un aller simple ou un aller-retour ?");
    expect(generate).not.toHaveBeenCalled();
  });
});
