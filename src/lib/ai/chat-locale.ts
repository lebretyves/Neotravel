import type { LanguageCode } from "@/shared/i18n/translations";

export type ChatLanguage = LanguageCode;

const SUPPORTED = new Set<ChatLanguage>(["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"]);

export function parseChatLanguage(value: unknown): ChatLanguage {
  if (typeof value === "string" && SUPPORTED.has(value as ChatLanguage)) {
    return value as ChatLanguage;
  }
  return "FR";
}

const REPLY_LANGUAGE: Record<ChatLanguage, string> = {
  FR: "français",
  EN: "anglais",
  ES: "espagnol",
  IT: "italien",
  PT: "portugais",
  DE: "allemand",
  ZH: "chinois simplifié",
  AR: "arabe",
};

export function replyLanguageInstruction(language: ChatLanguage): string {
  if (language === "FR") return "Réponds en français";
  return `Réponds en ${REPLY_LANGUAGE[language]} (langue sélectionnée par le client)`;
}

const NEXT_QUESTION: Record<ChatLanguage, Record<string, string>> = {
  FR: {
    departure_city: "Pour commencer, quelle est votre ville de départ ?",
    arrival_city: "Quelle est votre ville d'arrivée ?",
    departure_date: "À quelle date souhaitez-vous partir ? Une date approximative suffit pour avancer.",
    passenger_count: "Combien de passagers seront à bord ?",
    trip_type: "Souhaitez-vous un aller simple ou un aller-retour ?",
    email: "Quel email devons-nous utiliser pour vous recontacter ?",
  },
  EN: {
    departure_city: "To start, what is your departure city?",
    arrival_city: "What is your arrival city?",
    departure_date: "What departure date would you like? An approximate date is fine to begin.",
    passenger_count: "How many passengers will be travelling?",
    trip_type: "Would you like a one-way or round-trip journey?",
    email: "Which email should we use to contact you?",
  },
  ES: {
    departure_city: "Para empezar, ¿cuál es su ciudad de salida?",
    arrival_city: "¿Cuál es su ciudad de llegada?",
    departure_date: "¿En qué fecha desea salir? Una fecha aproximada basta para avanzar.",
    passenger_count: "¿Cuántos pasajeros viajarán?",
    trip_type: "¿Desea un viaje de ida o ida y vuelta?",
    email: "¿Qué correo electrónico debemos usar para contactarle?",
  },
  IT: {
    departure_city: "Per iniziare, qual è la città di partenza?",
    arrival_city: "Qual è la città di arrivo?",
    departure_date: "In quale data desidera partire? Una data approssimativa va bene per iniziare.",
    passenger_count: "Quanti passeggeri viaggeranno?",
    trip_type: "Desidera un viaggio di sola andata o andata e ritorno?",
    email: "Quale email dobbiamo usare per contattarla?",
  },
  PT: {
    departure_city: "Para começar, qual é a cidade de partida?",
    arrival_city: "Qual é a cidade de chegada?",
    departure_date: "Em que data deseja partir? Uma data aproximada é suficiente para avançar.",
    passenger_count: "Quantos passageiros viajarão?",
    trip_type: "Deseja uma viagem só de ida ou ida e volta?",
    email: "Qual email devemos usar para o contactar?",
  },
  DE: {
    departure_city: "Wie lautet zunächst Ihre Abfahrtsstadt?",
    arrival_city: "Wie lautet Ihre Ankunftsstadt?",
    departure_date: "An welchem Datum möchten Sie abfahren? Ein ungefähres Datum reicht zunächst.",
    passenger_count: "Wie viele Passagiere werden reisen?",
    trip_type: "Möchten Sie eine einfache Fahrt oder Hin- und Rückfahrt?",
    email: "Welche E-Mail-Adresse sollen wir für die Kontaktaufnahme verwenden?",
  },
  ZH: {
    departure_city: "请先告诉我您的出发城市。",
    arrival_city: "您的到达城市是哪里？",
    departure_date: "您希望哪天出发？大致日期也可以。",
    passenger_count: "共有多少位乘客？",
    trip_type: "您需要单程还是往返？",
    email: "我们应该使用哪个邮箱与您联系？",
  },
  AR: {
    departure_city: "لنبدأ، ما هي مدينة الانطلاق؟",
    arrival_city: "ما هي مدينة الوصول؟",
    departure_date: "في أي تاريخ ترغب بالمغادرة؟ يمكن أن يكون التاريخ تقريبياً.",
    passenger_count: "كم عدد الركاب؟",
    trip_type: "هل ترغب برحلة ذهاب فقط أم ذهاب وإياب؟",
    email: "ما البريد الإلكتروني الذي يمكننا استخدامه للتواصل معك؟",
  },
};

const NO_NEW_INFO: Record<ChatLanguage, Record<string, string>> = {
  FR: {
    departure_city: "Je n’ai pas encore la ville de départ.",
    arrival_city: "Je n’ai pas encore la ville d'arrivée.",
    departure_date:
      "Je n’ai pas encore la date de départ. Elle peut être approximative pour commencer, mais il m’en faut une pour préparer le devis.",
    passenger_count: "Je n’ai pas encore le nombre de passagers. Un ordre de grandeur suffit pour avancer.",
    default: "Je n’ai pas encore cette information.",
  },
  EN: {
    departure_date:
      "I do not have the departure date yet. An approximate date is fine to start, but I need one to prepare the quote.",
    passenger_count: "I do not have the passenger count yet. A rough number is enough to move forward.",
    default: "I do not have this information yet.",
  },
  ES: {
    departure_date:
      "Aún no tengo la fecha de salida. Puede ser aproximada para empezar, pero la necesito para preparar el presupuesto.",
    passenger_count: "Aún no tengo el número de pasajeros. Un orden de magnitud basta para avanzar.",
    default: "Aún no tengo esta información.",
  },
  IT: {
    departure_date:
      "Non ho ancora la data di partenza. Può essere approssimativa all'inizio, ma mi serve per preparare il preventivo.",
    passenger_count: "Non ho ancora il numero di passeggeri. Un ordine di grandezza basta per proseguire.",
    default: "Non ho ancora questa informazione.",
  },
  PT: {
    departure_date:
      "Ainda não tenho a data de partida. Pode ser aproximada para começar, mas preciso dela para preparar o orçamento.",
    passenger_count: "Ainda não tenho o número de passageiros. Uma ordem de grandeza basta para avançar.",
    default: "Ainda não tenho esta informação.",
  },
  DE: {
    departure_date:
      "Ich habe das Abfahrtsdatum noch nicht. Ein ungefähres Datum reicht zunächst, aber ich brauche eines für das Angebot.",
    passenger_count: "Ich habe die Passagierzahl noch nicht. Eine grobe Angabe reicht zum Weitermachen.",
    default: "Diese Information fehlt mir noch.",
  },
  ZH: {
    departure_date: "我还没有出发日期。大致日期也可以，但我需要它来准备报价。",
    passenger_count: "我还没有乘客人数。大致人数即可继续。",
    default: "我还没有这项信息。",
  },
  AR: {
    departure_date: "ليس لدي تاريخ المغادرة بعد. يمكن أن يكون تقريبياً في البداية، لكنني أحتاجه لإعداد العرض.",
    passenger_count: "ليس لدي عدد الركاب بعد. رقم تقريبي يكفي للمتابعة.",
    default: "ليس لدي هذه المعلومة بعد.",
  },
};

const TRIP_TYPE_PROMPT: Record<ChatLanguage, string> = {
  FR: "C’est noté. Souhaitez-vous un aller simple ou un aller-retour ?",
  EN: "Noted. Would you like a one-way or round-trip journey?",
  ES: "Entendido. ¿Desea un viaje de ida o ida y vuelta?",
  IT: "Perfetto. Desidera un viaggio di sola andata o andata e ritorno?",
  PT: "Anotado. Deseja uma viagem só de ida ou ida e volta?",
  DE: "Verstanden. Möchten Sie eine einfache Fahrt oder Hin- und Rückfahrt?",
  ZH: "已记录。您需要单程还是往返？",
  AR: "تم التسجيل. هل ترغب برحلة ذهاب فقط أم ذهاب وإياب؟",
};

const READY_DEFAULT: Record<ChatLanguage, string> = {
  FR: "Votre demande est prête à être traitée.",
  EN: "Your request is ready to be processed.",
  ES: "Su solicitud está lista para ser tratada.",
  IT: "La sua richiesta è pronta per essere elaborata.",
  PT: "O seu pedido está pronto para ser tratado.",
  DE: "Ihre Anfrage kann nun bearbeitet werden.",
  ZH: "您的需求已可处理。",
  AR: "طلبك جاهز للمعالجة.",
};

export function localizedNextQuestion(field: string, language: ChatLanguage): string {
  return NEXT_QUESTION[language][field] ?? NEXT_QUESTION.FR[field] ?? field;
}

export function localizedNoNewInfo(field: string, language: ChatLanguage): string {
  const pack = NO_NEW_INFO[language];
  const base = pack[field] ?? pack.default;
  const question = localizedNextQuestion(field, language);
  if (field === "departure_date" || field === "passenger_count") return base;
  return `${base} ${question}`;
}

export function localizedTripTypePrompt(language: ChatLanguage): string {
  return TRIP_TYPE_PROMPT[language];
}

export function localizedReadyDefault(language: ChatLanguage): string {
  return READY_DEFAULT[language];
}

export function localizedQualifiedSummary(
  lead: {
    departure_city?: string;
    arrival_city?: string;
    departure_date?: string;
    passenger_count?: number;
    trip_type?: string;
  },
  language: ChatLanguage,
): string {
  const on = language === "EN" ? "on" : language === "DE" ? "am" : language === "ES" ? "el" : language === "IT" ? "il" : language === "PT" ? "em" : language === "ZH" ? "" : language === "AR" ? "في" : "le";
  const passengersLabel: Record<ChatLanguage, string> = {
    FR: "passagers",
    EN: "passengers",
    ES: "pasajeros",
    IT: "passeggeri",
    PT: "passageiros",
    DE: "Passagiere",
    ZH: "位乘客",
    AR: "راكب",
  };
  const tripLabels: Record<ChatLanguage, { round: string; oneWay: string }> = {
    FR: { round: "aller-retour", oneWay: "aller simple" },
    EN: { round: "round trip", oneWay: "one way" },
    ES: { round: "ida y vuelta", oneWay: "solo ida" },
    IT: { round: "andata e ritorno", oneWay: "solo andata" },
    PT: { round: "ida e volta", oneWay: "só ida" },
    DE: { round: "Hin- und Rückfahrt", oneWay: "einfache Fahrt" },
    ZH: { round: "往返", oneWay: "单程" },
    AR: { round: "ذهاب وإياب", oneWay: "ذهاب فقط" },
  };

  const parts = [
    lead.departure_city && lead.arrival_city ? `${lead.departure_city} → ${lead.arrival_city}` : null,
    lead.departure_date
      ? language === "ZH"
        ? lead.departure_date
        : language === "AR"
          ? `${on} ${lead.departure_date}`
          : `${on} ${lead.departure_date}`
      : null,
    lead.passenger_count
      ? language === "ZH"
        ? `${lead.passenger_count}${passengersLabel[language]}`
        : `${lead.passenger_count} ${passengersLabel[language]}`
      : null,
    lead.trip_type === "round_trip"
      ? tripLabels[language].round
      : lead.trip_type === "one_way"
        ? tripLabels[language].oneWay
        : null,
  ].filter(Boolean);

  return parts.join(", ");
}

export function localizedQualifiedFallback(summary: string, language: ChatLanguage): string {
  const templates: Record<ChatLanguage, string> = {
    FR: `Parfait, j'ai toutes les informations pour votre trajet (${summary}). Votre devis est prêt.`,
    EN: `Perfect, I have all the information for your trip (${summary}). Your quote is ready.`,
    ES: `Perfecto, tengo toda la información de su trayecto (${summary}). Su presupuesto está listo.`,
    IT: `Perfetto, ho tutte le informazioni per il suo viaggio (${summary}). Il preventivo è pronto.`,
    PT: `Perfeito, tenho todas as informações da sua viagem (${summary}). O seu orçamento está pronto.`,
    DE: `Perfekt, ich habe alle Informationen für Ihre Fahrt (${summary}). Ihr Angebot ist bereit.`,
    ZH: `很好，我已收集您行程的全部信息（${summary}）。报价已准备好。`,
    AR: `ممتاز، لدي كل المعلومات عن رحلتك (${summary}). عرض السعر جاهز.`,
  };
  return templates[language];
}

const HUMAN_REVIEW: Record<ChatLanguage, Record<string, string>> = {
  FR: {
    PAX_OVER_85:
      "Votre demande dépasse notre capacité standard (85 passagers). Notre équipe vous contactera pour une solution adaptée.",
    DEPARTURE_IN_PAST: "La date de départ indiquée est déjà passée. Merci de nous préciser une date à venir.",
    UNKNOWN_ROUTE_NO_DISTANCE:
      "Cet itinéraire n'est pas encore référencé dans notre base. Notre équipe calculera le tarif manuellement et vous recontactera.",
    INVALID_DATE: "La date de départ fournie est invalide. Merci de la vérifier.",
    PAX_ZERO_OR_NEGATIVE: "Le nombre de passagers indiqué n'est pas valide. Merci de le préciser.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
      "Votre trajet comporte un arrêt intermédiaire. Notre équipe doit vérifier l'itinéraire avant de préparer le devis.",
    default: "Votre demande nécessite une vérification par notre équipe. Nous vous contacterons rapidement.",
  },
  EN: {
    PAX_OVER_85:
      "Your request exceeds our standard capacity (85 passengers). Our team will contact you with a tailored solution.",
    DEPARTURE_IN_PAST: "The departure date provided is already in the past. Please share an upcoming date.",
    UNKNOWN_ROUTE_NO_DISTANCE:
      "This route is not yet in our database. Our team will calculate the fare manually and get back to you.",
    INVALID_DATE: "The departure date provided is invalid. Please check it.",
    PAX_ZERO_OR_NEGATIVE: "The passenger count provided is not valid. Please clarify it.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
      "Your trip includes an intermediate stop. Our team must review the route before preparing the quote.",
    default: "Your request needs a review by our team. We will contact you shortly.",
  },
  ES: {
    PAX_OVER_85:
      "Su solicitud supera nuestra capacidad estándar (85 pasajeros). Nuestro equipo le contactará con una solución adaptada.",
    DEPARTURE_IN_PAST: "La fecha de salida indicada ya ha pasado. Indíquenos una fecha futura.",
    UNKNOWN_ROUTE_NO_DISTANCE:
      "Este itinerario aún no está en nuestra base. Nuestro equipo calculará la tarifa manualmente y le contactará.",
    INVALID_DATE: "La fecha de salida proporcionada no es válida. Por favor, compruébela.",
    PAX_ZERO_OR_NEGATIVE: "El número de pasajeros indicado no es válido. Por favor, aclárelo.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
      "Su trayecto incluye una parada intermedia. Nuestro equipo debe revisar la ruta antes del presupuesto.",
    default: "Su solicitud requiere una revisión de nuestro equipo. Le contactaremos en breve.",
  },
  IT: {
    PAX_OVER_85:
      "La richiesta supera la nostra capacità standard (85 passeggeri). Il nostro team la contatterà con una soluzione su misura.",
    DEPARTURE_IN_PAST: "La data di partenza indicata è già passata. Indichi una data futura.",
    UNKNOWN_ROUTE_NO_DISTANCE:
      "Questo itinerario non è ancora nella nostra base. Il nostro team calcolerà manualmente la tariffa.",
    INVALID_DATE: "La data di partenza fornita non è valida. La preghiamo di verificarla.",
    PAX_ZERO_OR_NEGATIVE: "Il numero di passeggeri indicato non è valido. Lo preghiamo di precisarlo.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
      "Il viaggio include una sosta intermedia. Il nostro team deve verificare l'itinerario prima del preventivo.",
    default: "La richiesta richiede una verifica del nostro team. La contatteremo a breve.",
  },
  PT: {
    PAX_OVER_85:
      "O seu pedido excede a nossa capacidade padrão (85 passageiros). A nossa equipa entrará em contacto consigo.",
    DEPARTURE_IN_PAST: "A data de partida indicada já passou. Indique uma data futura.",
    UNKNOWN_ROUTE_NO_DISTANCE:
      "Este itinerário ainda não está na nossa base. A nossa equipa calculará a tarifa manualmente.",
    INVALID_DATE: "A data de partida fornecida é inválida. Verifique-a, por favor.",
    PAX_ZERO_OR_NEGATIVE: "O número de passageiros indicado não é válido. Precise-o, por favor.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
      "A viagem inclui uma paragem intermédia. A nossa equipa deve rever o itinerário antes do orçamento.",
    default: "O seu pedido requer verificação da nossa equipa. Entraremos em contacto em breve.",
  },
  DE: {
    PAX_OVER_85:
      "Ihre Anfrage überschreitet unsere Standardkapazität (85 Passagiere). Unser Team meldet sich mit einer passenden Lösung.",
    DEPARTURE_IN_PAST: "Das angegebene Abfahrtsdatum liegt in der Vergangenheit. Bitte nennen Sie ein zukünftiges Datum.",
    UNKNOWN_ROUTE_NO_DISTANCE:
      "Diese Route ist noch nicht in unserer Datenbank. Unser Team berechnet den Preis manuell.",
    INVALID_DATE: "Das angegebene Abfahrtsdatum ist ungültig. Bitte prüfen Sie es.",
    PAX_ZERO_OR_NEGATIVE: "Die angegebene Passagierzahl ist ungültig. Bitte präzisieren Sie sie.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE:
      "Ihre Fahrt enthält einen Zwischenstopp. Unser Team muss die Route vor dem Angebot prüfen.",
    default: "Ihre Anfrage muss von unserem Team geprüft werden. Wir melden uns in Kürze.",
  },
  ZH: {
    PAX_OVER_85: "您的需求超过标准容量（85 人）。我们的团队将联系您提供定制方案。",
    DEPARTURE_IN_PAST: "您提供的出发日期已过期。请提供一个未来的日期。",
    UNKNOWN_ROUTE_NO_DISTANCE: "该路线尚未录入系统。我们的团队将人工计算价格并与您联系。",
    INVALID_DATE: "提供的出发日期无效。请检查。",
    PAX_ZERO_OR_NEGATIVE: "提供的乘客人数无效。请说明。",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE: "您的行程包含中途停靠。我们的团队需先核实路线。",
    default: "您的需求需要团队人工审核。我们会尽快联系您。",
  },
  AR: {
    PAX_OVER_85: "طلبك يتجاوز السعة القياسية (85 راكباً). سيتواصل معك فريقنا بحل مناسب.",
    DEPARTURE_IN_PAST: "تاريخ المغادرة المذكور قد مضى. يرجى تقديم تاريخ قادم.",
    UNKNOWN_ROUTE_NO_DISTANCE: "هذا المسار غير مسجل بعد. سيحسب فريقنا السعر يدوياً ويتواصل معك.",
    INVALID_DATE: "تاريخ المغادرة غير صالح. يرجى التحقق منه.",
    PAX_ZERO_OR_NEGATIVE: "عدد الركاب غير صالح. يرجى توضيحه.",
    INTERMEDIATE_STOP_REQUIRES_MANUAL_ROUTE: "رحلتك تتضمن محطة وسيطة. يجب على فريقنا مراجعة المسار أولاً.",
    default: "طلبك يحتاج إلى مراجعة من فريقنا. سنتواصل معك قريباً.",
  },
};

export function localizedHumanReviewMessage(reason: string, language: ChatLanguage): string {
  const pack = HUMAN_REVIEW[language];
  return pack[reason] ?? pack.default;
}

export const CHAT_API_MESSAGES: Record<
  ChatLanguage,
  {
    emptyMessage: string;
    promptInjection: string;
    serviceUnavailable: string;
    correctionBeforeQuote: string;
  }
> = {
  FR: {
    emptyMessage: "Votre message est vide. Ajoutez quelques informations sur votre trajet.",
    promptInjection:
      "Les règles tarifaires ne peuvent pas être modifiées depuis la conversation. Un conseiller peut vérifier votre demande.",
    serviceUnavailable: "Le service de conversation est momentanément indisponible. Réessayez dans un instant.",
    correctionBeforeQuote:
      "Votre demande contient assez d'informations, mais un point doit être corrigé avant de générer le devis.",
  },
  EN: {
    emptyMessage: "Your message is empty. Add some details about your trip.",
    promptInjection:
      "Pricing rules cannot be changed from the chat. An advisor can review your request.",
    serviceUnavailable: "The chat service is temporarily unavailable. Please try again shortly.",
    correctionBeforeQuote:
      "Your request has enough information, but one point must be corrected before generating the quote.",
  },
  ES: {
    emptyMessage: "Su mensaje está vacío. Añada información sobre su trayecto.",
    promptInjection:
      "Las reglas tarifarias no pueden modificarse desde el chat. Un asesor puede revisar su solicitud.",
    serviceUnavailable: "El servicio de chat no está disponible temporalmente. Inténtelo de nuevo en un momento.",
    correctionBeforeQuote:
      "Su solicitud tiene suficiente información, pero hay un punto que corregir antes de generar el presupuesto.",
  },
  IT: {
    emptyMessage: "Il messaggio è vuoto. Aggiunga qualche informazione sul viaggio.",
    promptInjection:
      "Le regole tariffarie non possono essere modificate dalla chat. Un consulente può verificare la richiesta.",
    serviceUnavailable: "Il servizio di chat non è momentaneamente disponibile. Riprovi tra poco.",
    correctionBeforeQuote:
      "La richiesta contiene abbastanza informazioni, ma un punto va corretto prima di generare il preventivo.",
  },
  PT: {
    emptyMessage: "A mensagem está vazia. Adicione informações sobre a viagem.",
    promptInjection:
      "As regras de preços não podem ser alteradas no chat. Um consultor pode rever o pedido.",
    serviceUnavailable: "O serviço de chat está temporariamente indisponível. Tente novamente dentro de instantes.",
    correctionBeforeQuote:
      "O pedido tem informação suficiente, mas há um ponto a corrigir antes de gerar o orçamento.",
  },
  DE: {
    emptyMessage: "Ihre Nachricht ist leer. Fügen Sie einige Angaben zu Ihrer Fahrt hinzu.",
    promptInjection:
      "Preisregeln können im Chat nicht geändert werden. Ein Berater kann Ihre Anfrage prüfen.",
    serviceUnavailable: "Der Chat-Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es gleich erneut.",
    correctionBeforeQuote:
      "Ihre Anfrage enthält genug Informationen, aber ein Punkt muss vor dem Angebot korrigiert werden.",
  },
  ZH: {
    emptyMessage: "您的消息为空。请补充一些行程信息。",
    promptInjection: "无法在对话中修改定价规则。顾问可以审核您的需求。",
    serviceUnavailable: "对话服务暂时不可用。请稍后再试。",
    correctionBeforeQuote: "您的需求信息已较完整，但有一项需在生成报价前更正。",
  },
  AR: {
    emptyMessage: "رسالتك فارغة. أضف بعض المعلومات عن رحلتك.",
    promptInjection: "لا يمكن تعديل قواعد التسعير من المحادثة. يمكن لمستشار مراجعة طلبك.",
    serviceUnavailable: "خدمة المحادثة غير متاحة مؤقتاً. أعد المحاولة بعد قليل.",
    correctionBeforeQuote: "طلبك يحتوي معلومات كافية، لكن يجب تصحيح نقطة قبل إنشاء العرض.",
  },
};

export function localizedSendError(language: ChatLanguage): string {
  const messages: Record<ChatLanguage, string> = {
    FR: "Je n’ai pas pu envoyer votre message. Réessayez dans un instant, ou contactez-nous si besoin.",
    EN: "I could not send your message. Please try again shortly, or contact us if needed.",
    ES: "No pude enviar su mensaje. Inténtelo de nuevo en un momento o contáctenos si lo necesita.",
    IT: "Non sono riuscito a inviare il messaggio. Riprovi tra poco o ci contatti se necessario.",
    PT: "Não consegui enviar a mensagem. Tente novamente dentro de instantes ou contacte-nos se precisar.",
    DE: "Ihre Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es gleich erneut oder kontaktieren Sie uns.",
    ZH: "无法发送您的消息。请稍后再试，或联系我们。",
    AR: "تعذر إرسال رسالتك. أعد المحاولة بعد قليل أو تواصل معنا إذا لزم الأمر.",
  };
  return messages[language];
}
