export const AI_RUNTIME_RULES = {
  version: "1.0",
  defaultLanguage: "fr-CA",
  supportedLanguages: ["fr-CA", "en-US"],
  defaultDepartment: "service",

  languageRules: {
    mirrorCallerLanguage: true,
    doNotSwitchMidCall: true,
    confirmCriticalFields: [
      "phoneNumber",
      "appointmentDate",
      "appointmentTime",
      "vehicleYear",
      "vehicleModel",
      "vin"
    ],
    confirmationPatterns: {
      phoneNumber: {
        "en-US": "Just to confirm, the phone number is {value}.",
        "fr-CA": "Juste pour confirmer, le numéro de téléphone est {value}."
      },
      appointmentTime: {
        "en-US": "Just to confirm, the appointment is for {value}.",
        "fr-CA": "Juste pour confirmer, le rendez-vous est pour {value}."
      },
      vehicle: {
        "en-US": "And that is for the {value}, correct?",
        "fr-CA": "Et c’est pour le {value}, c’est bien ça?"
      }
    }
  },

  safeResponseRules: {
    neverGuess: true,
    transferIfLowConfidence: true,
    lowConfidenceThreshold: 0.65,
    safeFallback: {
      "en-US": "I don’t want to give you the wrong information. Let me verify that with the right team for you.",
      "fr-CA": "Je ne veux pas vous donner une mauvaise information. Laissez-moi vérifier ça avec la bonne équipe pour vous."
    }
  },

  entitySchema: {
    phoneNumber: { requiredFor: ["service", "status", "reschedule", "missed_call_followup"] },
    vehicleYear: { requiredFor: ["service_booking", "diagnostic", "booking"] },
    vehicleModel: { requiredFor: ["service_booking", "diagnostic", "booking"] },
    vin: { requiredFor: ["first_time_customer_setup"] },
    address: { requiredFor: ["first_time_customer_setup"] },
    postalCode: { requiredFor: ["first_time_customer_setup"] },
    serviceReason: { requiredFor: ["service_booking"] },
    symptom: { requiredFor: ["diagnostic", "urgent_dropoff"] },
    waitOrDropoff: { requiredFor: ["service_booking", "diagnostic"] },
    appointmentDate: { requiredFor: ["booking", "reschedule"] },
    appointmentTime: { requiredFor: ["booking", "reschedule"] },
    employeeName: { requiredFor: ["specific_person_transfer"] },
    vehicleOfInterest: { requiredFor: ["sales_vehicle_inquiry"] },
    callbackNumber: { requiredFor: ["sales_vehicle_inquiry"] }
  },

  intents: [
    {
      id: "service_book_maintenance",
      department: "service",
      priority: "high",
      bookable: true,
      intentGroup: "service_booking",
      triggers: [
        "book an appointment",
        "service reminder",
        "maintenance due",
        "oil change",
        "tire change",
        "summer tires",
        "winter tires"
      ],
      requiredEntities: ["phoneNumber", "vehicleYear", "vehicleModel", "serviceReason", "waitOrDropoff"]
    },
    {
      id: "service_book_diagnostic",
      department: "service",
      priority: "high",
      bookable: true,
      intentGroup: "diagnostic",
      triggers: [
        "noise",
        "warning light",
        "check engine",
        "brake noise",
        "problem with car",
        "verify the car",
        "diagnostic"
      ],
      requiredEntities: ["phoneNumber", "vehicleYear", "vehicleModel", "symptom", "waitOrDropoff"]
    },
    {
      id: "service_urgent_dropoff",
      department: "service",
      priority: "urgent",
      bookable: true,
      intentGroup: "urgent_dropoff",
      triggers: [
        "urgent",
        "trunk opens by itself",
        "safety concern",
        "same problem as before",
        "can’t leave the car like this"
      ],
      requiredEntities: ["phoneNumber", "vehicleYear", "vehicleModel", "symptom"]
    },
    {
      id: "service_reschedule",
      department: "service",
      priority: "high",
      bookable: true,
      intentGroup: "reschedule",
      triggers: [
        "change my appointment",
        "reschedule",
        "missed appointment",
        "can’t make it",
        "move to another time"
      ],
      requiredEntities: ["phoneNumber", "existingAppointmentDate", "appointmentDate", "appointmentTime"]
    },
    {
      id: "service_status_ready_check",
      department: "service",
      priority: "high",
      bookable: false,
      intentGroup: "status",
      triggers: [
        "is my car ready",
        "pickup today",
        "what time can I pick it up",
        "still in progress",
        "ready at service"
      ],
      requiredEntities: ["phoneNumber"]
    },
    {
      id: "service_first_time_customer_setup",
      department: "service",
      priority: "medium",
      bookable: true,
      intentGroup: "first_time_customer_setup",
      triggers: [
        "first time",
        "new customer",
        "first visit",
        "file not complete"
      ],
      requiredEntities: ["phoneNumber", "vin", "address", "postalCode", "vehicleYear", "vehicleModel"]
    },
    {
      id: "service_courtesy_vehicle",
      department: "service",
      priority: "medium",
      bookable: true,
      intentGroup: "booking_addon",
      triggers: [
        "courtesy vehicle",
        "loaner",
        "replacement car",
        "vehicle d’échange",
        "courtesy car"
      ],
      requiredEntities: ["needsCourtesyVehicle"]
    },
    {
      id: "service_bundle_multiple_items",
      department: "service",
      priority: "medium",
      bookable: true,
      intentGroup: "booking_addon",
      triggers: [
        "recall",
        "warranty",
        "maintenance together",
        "do both at same time",
        "multiple things"
      ],
      requiredEntities: ["allRequestedServices"]
    },
    {
      id: "service_addon_detailing",
      department: "service",
      priority: "medium",
      bookable: true,
      intentGroup: "booking_addon",
      triggers: [
        "cleaning",
        "salt stains",
        "full cleaning",
        "detailing",
        "shampoo carpets"
      ],
      requiredEntities: ["detailPackageRequested"]
    },
    {
      id: "parts_request",
      department: "parts",
      priority: "medium",
      bookable: false,
      intentGroup: "parts",
      triggers: ["parts", "pièces", "speak to parts", "department de pièce"],
      requiredEntities: []
    },
    {
      id: "finance_payment_issue",
      department: "finance",
      priority: "high",
      bookable: false,
      intentGroup: "finance",
      triggers: ["payment didn’t go through", "payment issue", "finance", "car payment"],
      requiredEntities: ["phoneNumber"]
    },
    {
      id: "finance_lease_end",
      department: "finance",
      priority: "medium",
      bookable: false,
      intentGroup: "finance",
      triggers: ["lease ending", "contract ending", "options at end of lease"],
      requiredEntities: ["phoneNumber"]
    },
    {
      id: "warranty_request",
      department: "service",
      priority: "medium",
      bookable: false,
      intentGroup: "warranty",
      triggers: ["warranty", "extended warranty", "under warranty", "garantie"],
      requiredEntities: []
    },
    {
      id: "sales_vehicle_inquiry",
      department: "sales",
      priority: "high",
      bookable: false,
      intentGroup: "sales",
      triggers: [
        "vehicle on Facebook",
        "vehicle on Marketplace",
        "is it available",
        "new or used vehicle",
        "speak with sales"
      ],
      requiredEntities: ["vehicleOfInterest", "callbackNumber"]
    },
    {
      id: "sales_walkin_event",
      department: "sales",
      priority: "medium",
      bookable: false,
      intentGroup: "sales",
      triggers: ["I’ll be there in 20 minutes", "event", "promo", "0% financing", "coming in now"],
      requiredEntities: []
    },
    {
      id: "specific_person_transfer",
      department: "transfer",
      priority: "medium",
      bookable: false,
      intentGroup: "transfer",
      triggers: ["talk to Luke", "talk to Marco", "talk to Michel", "talk to Luc", "talk to salesperson"],
      requiredEntities: ["employeeName"]
    },
    {
      id: "missed_call_followup",
      department: "service",
      priority: "medium",
      bookable: true,
      intentGroup: "missed_call_followup",
      triggers: ["I received a call from you", "why did you call", "left a message", "you called me earlier"],
      requiredEntities: ["phoneNumber"]
    },
    {
      id: "onsite_coordination",
      department: "service",
      priority: "high",
      bookable: false,
      intentGroup: "onsite_coordination",
      triggers: ["my kids are there", "they are waiting there", "can someone take the keys", "already at dealership"],
      requiredEntities: ["immediateNeed"]
    },
    {
      id: "rental_or_enterprise_question",
      department: "service",
      priority: "medium",
      bookable: false,
      intentGroup: "rental_question",
      triggers: ["Enterprise", "rental coverage", "charged for rental", "loaner until pickup"],
      requiredEntities: ["phoneNumber"]
    }
  ],

  routing: {
    service: {
      routeWhen: [
        "appointment booking",
        "maintenance reminder",
        "diagnostic issue",
        "warning light",
        "brake noise",
        "vehicle status",
        "pickup timing",
        "service advisor request",
        "warranty operational issue"
      ],
      action: "handle_or_transfer_service"
    },
    parts: {
      routeWhen: ["caller asks for parts", "pièces request"],
      action: "transfer_parts"
    },
    finance: {
      routeWhen: ["payment issue", "lease ending", "contract ending", "F&I request"],
      action: "transfer_finance"
    },
    sales: {
      routeWhen: ["vehicle inquiry", "ask for salesperson", "new or used vehicle interest", "event/promo visit"],
      action: "transfer_sales_or_capture_lead"
    },
    namedEmployee: {
      routeWhen: ["named employee request"],
      action: "transfer_named_employee"
    },
    onsiteCoordination: {
      routeWhen: ["customer already onsite", "needs immediate onsite help"],
      action: "internal_coordinate_immediately"
    }
  },

  bookingFlow: {
    enabled: true,
    steps: [
      "identify_intent",
      "confirm_language",
      "capture_phone_number",
      "confirm_vehicle",
      "capture_reason",
      "run_urgency_check",
      "ask_wait_or_dropoff",
      "complete_first_time_profile_if_needed",
      "offer_available_slots",
      "capture_addons_if_needed",
      "confirm_booking",
      "send_confirmation"
    ],
    urgencyBuckets: {
      routine: ["tire change", "maintenance reminder", "oil change"],
      diagnostic: ["noise", "warning light", "check engine", "brake noise"],
      urgentDropoff: [
        "unsafe or concerning symptom",
        "recurrent brake issue",
        "customer cannot leave vehicle unsecured",
        "normal schedule full but issue needs inspection"
      ]
    }
  },

  responseLibrary: {
    service: {
      bookMaintenance: {
        "en-US": "Absolutely — I can help you with that. Can I have the phone number on file, please?",
        "fr-CA": "Parfait — je peux vous aider avec ça. Quel est le numéro de téléphone au dossier, s’il vous plaît?"
      },
      bookDiagnostic: {
        "en-US": "I can help with that. Can I have the phone number on file, and can you tell me exactly what the vehicle is doing?",
        "fr-CA": "Je peux vous aider avec ça. Quel est le numéro de téléphone au dossier, et qu’est-ce que la voiture fait exactement?"
      },
      askWaitOrDropoff: {
        "en-US": "Will you be waiting with the vehicle, or leaving it with us for the day?",
        "fr-CA": "Est-ce que vous allez attendre avec la voiture, ou la laisser pour la journée?"
      },
      offerAvailability: {
        "en-US": "Our next availability is toward the end of the month. I can offer you a few options.",
        "fr-CA": "Nos prochaines disponibilités sont vers la fin du mois. Je peux vous proposer quelques options."
      },
      confirmBooking: {
        "en-US": "Perfect — you’re all set. You’ll receive a confirmation by email and text message.",
        "fr-CA": "Parfait — c’est confirmé. Vous allez recevoir la confirmation par courriel et par message texte."
      },
      statusCheck: {
        "en-US": "Let me check that for you right away.",
        "fr-CA": "Je vais vérifier ça pour vous tout de suite."
      }
    },
    sales: {
      transfer: {
        "en-US": "Of course — I can connect you with our sales team. Is this for a new or pre-owned vehicle?",
        "fr-CA": "Bien sûr — je peux vous transférer à notre équipe des ventes. Est-ce pour un véhicule neuf ou d’occasion?"
      }
    },
    parts: {
      transfer: {
        "en-US": "Perfect — I’ll transfer you to parts right away.",
        "fr-CA": "Parfait — je vous transfère au département des pièces tout de suite."
      }
    },
    finance: {
      transfer: {
        "en-US": "I understand — I’ll connect you with our finance department right away.",
        "fr-CA": "Je comprends — je vais vous transférer à notre département financier tout de suite."
      }
    },
    fallback: {
      safeDeferral: {
        "en-US": "I don’t want to give you the wrong information. Let me verify that with the right team for you.",
        "fr-CA": "Je ne veux pas vous donner une mauvaise information. Laissez-moi vérifier ça avec la bonne équipe pour vous."
      }
    }
  },

  objectionHandling: {
    notReadyToBook: {
      signals: ["not now", "I don’t have my schedule", "I’ll call back", "not sure yet"],
      response: {
        "en-US": "No problem at all. Would you like us to follow up with you, or would you prefer to call us back when you’re ready?",
        "fr-CA": "Aucun problème. Préférez-vous qu’on fasse un suivi avec vous, ou vous préférez nous rappeler quand vous serez prêt?"
      }
    },
    busyScheduleNoAvailability: {
      signals: ["nothing sooner?", "that’s late", "very busy huh"],
      response: {
        "en-US": "Our next available appointments are toward the end of the month, but I can secure one for you now.",
        "fr-CA": "Nos prochains rendez-vous disponibles sont vers la fin du mois, mais je peux vous en réserver un maintenant."
      }
    },
    issueSeemsGone: {
      signals: ["it’s okay now", "the problem stopped", "it came and went"],
      response: {
        "en-US": "That’s good to hear. Since it happened recently, it’s still worth checking to make sure everything is okay.",
        "fr-CA": "C’est une bonne chose. Comme c’est arrivé récemment, ça vaut quand même la peine de le faire vérifier pour s’assurer que tout est correct."
      }
    }
  },

  callHandlingPolicy: {
    answerDirectlyWhen: [
      "hours and directions",
      "basic service booking flow",
      "pickup timing if known",
      "general transfer request",
      "basic appointment confirmation language"
    ],
    escalateWhen: [
      "financial coverage question",
      "warranty coverage uncertainty",
      "rental reimbursement uncertainty",
      "exact repair completion promise requested",
      "caller upset or unresolved after two attempts",
      "system confidence below threshold"
    ],
    neverPromise: [
      "exact repair completion time",
      "loaner availability before confirmation",
      "rental coverage without verification",
      "warranty eligibility without verification",
      "inventory availability without system confirmation"
    ]
  }
};

export function detectLanguageFromText(text = "") {
  const lower = String(text).toLowerCase();
  const frenchSignals = [
    "bonjour",
    "rendez-vous",
    "voiture",
    "merci",
    "garage",
    "service",
    "pièces",
    "bonjour",
    "garantie"
  ];

  const hasFrench = frenchSignals.some((s) => lower.includes(s));
  return hasFrench ? "fr-CA" : "en-US";
}

export function findIntentFromUtterance(text = "") {
  const lower = String(text).toLowerCase();

  for (const intent of AI_RUNTIME_RULES.intents) {
    if (intent.triggers.some((trigger) => lower.includes(trigger.toLowerCase()))) {
      return intent;
    }
  }

  return null;
}

export function getResponse(path, language = "en-US") {
  const parts = path.split(".");
  let node = AI_RUNTIME_RULES.responseLibrary;

  for (const part of parts) {
    node = node?.[part];
    if (!node) return "";
  }

  return node[language] || node["en-US"] || "";
}

export function isBookableIntent(intentId = "") {
  const intent = AI_RUNTIME_RULES.intents.find((i) => i.id === intentId);
  return Boolean(intent?.bookable);
}
