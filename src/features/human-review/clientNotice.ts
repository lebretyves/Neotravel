/**
 * Messages client lorsqu'un devis ou une demande passe en revue humaine.
 * Insiste sur la validation en cours — pas sur un échec de préparation.
 */
export function clientHumanReviewNotice(reason?: string | null): string {
  if (reason === "PAX_OVER_85" || reason === "PASSENGER_COUNT_ABOVE_AUTOMATIC_LIMIT") {
    return "Votre devis doit être revu par un conseiller pour adapter la solution à votre groupe. Vous serez recontacté rapidement.";
  }

  if (reason === "INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE") {
    return "Votre devis comporte une escale : notre équipe doit le valider avant de vous le transmettre.";
  }

  if (reason === "UNKNOWN_ROUTE_NO_DISTANCE" || reason === "UNKNOWN_ROUTE_WITHOUT_CONTROLLED_DISTANCE") {
    return "Votre devis doit être revu par un conseiller pour confirmer l'itinéraire et le tarif.";
  }

  if (reason === "URGENT_DEPARTURE_UNDER_48H" || reason === "DEPARTURE_LESS_THAN_48H") {
    return "Votre devis est en revue humaine pour confirmer la faisabilité du départ à court terme.";
  }

  if (reason === "QUOTE_CHANGE_REQUEST") {
    return "Votre demande de modification a été enregistrée : un conseiller revoit votre devis.";
  }

  return "Votre devis est en revue humaine. Un conseiller le validera avant de vous le communiquer.";
}
