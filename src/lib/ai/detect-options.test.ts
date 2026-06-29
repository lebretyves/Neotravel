import { describe, expect, it } from "vitest";

import { detectOptions, detectOptionRemovals } from "./detect-options";

describe("detectOptions", () => {
  it("detects a guide request in option contexts", () => {
    expect(detectOptions("On voudrait un guide accompagnateur sur place.")).toEqual({ guide: true });
    expect(detectOptions("Avec guide si possible.")).toEqual({ guide: true });
    expect(detectOptions("On aurait besoin d'un guide.")).toEqual({ guide: true });
    expect(detectOptions("Prévoir un accompagnateur.")).toEqual({ guide: true });
    expect(detectOptions("Une visite guidée serait top.")).toEqual({ guide: true });
    expect(detectOptions("Un guide touristique pour la journée.")).toEqual({ guide: true });
  });

  it("does NOT flag the verb 'guider' / imperative 'guide-moi'", () => {
    expect(detectOptions("Guide-moi dans la demande s'il te plaît.")).toEqual({});
    expect(detectOptions("Tu peux me guider ?")).toEqual({});
    expect(detectOptions("Je veux être guidé dans la démarche.")).toEqual({});
  });

  it("does NOT expose péages as a selectable option", () => {
    expect(detectOptions("Est-ce que les péages sont inclus ?")).toEqual({});
  });

  it("detects an explicit driver overnight request", () => {
    expect(detectOptions("Il faudra une nuit chauffeur sur place.")).toMatchObject({ driver_overnight: true });
    expect(detectOptions("Le chauffeur devra dormir sur place.")).toMatchObject({ driver_overnight: true });
    expect(detectOptions("Prévoir l'hébergement du chauffeur.")).toMatchObject({ driver_overnight: true });
  });

  it("does NOT infer driver overnight from a multi-day / next-day return trip", () => {
    expect(detectOptions("Aller-retour, on part demain et on revient le lendemain.")).toEqual({});
    expect(detectOptions("Départ le 12, retour le 13.")).toEqual({});
  });

  it("respects negations", () => {
    expect(detectOptions("Sans guide, et sans péage si possible.")).toEqual({});
    expect(detectOptions("Pas de guide nécessaire.")).toEqual({});
  });

  it("returns empty when no option is mentioned", () => {
    expect(detectOptions("Je veux un car de Paris à Lyon pour 40 personnes.")).toEqual({});
  });

  it("detects multiple options at once", () => {
    expect(detectOptions("Un guide, les péages inclus, et une nuit pour le chauffeur.")).toEqual({
      guide: true,
      driver_overnight: true,
    });
  });
});

describe("detectOptionRemovals", () => {
  it("detects a guide removal via verb or negation", () => {
    expect(detectOptionRemovals("enleve mon guide, j'en ai pas besoin finalement")).toEqual(["guide"]);
    expect(detectOptionRemovals("je ne veux pas de guide")).toEqual(["guide"]);
    expect(detectOptionRemovals("je ne veux plus de guide")).toEqual(["guide"]);
    expect(detectOptionRemovals("Sans guide finalement.")).toEqual(["guide"]);
    expect(detectOptionRemovals("Retire l'accompagnateur s'il te plaît.")).toEqual(["guide"]);
    expect(detectOptionRemovals("Pas besoin de guide.")).toEqual(["guide"]);
  });

  it("detects a driver-overnight removal", () => {
    expect(detectOptionRemovals("enleve la nuit chauffeur")).toEqual(["driver_overnight"]);
    expect(detectOptionRemovals("pas de nuit chauffeur")).toEqual(["driver_overnight"]);
  });

  it("does NOT flag a removal when the option is being requested", () => {
    expect(detectOptionRemovals("je veux un guide")).toEqual([]);
    expect(detectOptionRemovals("Avec un guide accompagnateur.")).toEqual([]);
    expect(detectOptionRemovals("Une nuit pour le chauffeur.")).toEqual([]);
  });

  it("removes only the negated option in a mixed sentence", () => {
    expect(detectOptionRemovals("je veux un guide mais pas de nuit chauffeur")).toEqual([
      "driver_overnight",
    ]);
  });
});
