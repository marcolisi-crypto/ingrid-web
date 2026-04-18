// netlify/functions/create-appointment.mjs

const DEFAULT_TIMEZONE = process.env.BOOKING_TIMEZONE || "America/Toronto";
const DEFAULT_BUSINESS_NAME = process.env.BUSINESS_NAME || "Automotive Intelligence Technologies";
const DEFAULT_NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "";
const DEFAULT_REQUIRE_EMAIL = String(process.env.REQUIRE_EMAIL || "false").toLowerCase() === "true";
const DEFAULT_BLOCK_WEEKENDS = String(process.env.BLOCK_WEEKENDS || "true").toLowerCase() === "true";

const I18N = {
  en: {
    success: "Appointment created successfully.",
    invalidMethod: "Method not allowed.",
    invalidJson: "Invalid JSON body.",
    missingName: "Missing required field: name.",
    missingPhone: "Missing required field: phone.",
    missingDate: "Missing required field: date.",
    missingTime: "Missing required field: time.",
    missingService: "Missing required field: service.",
    missingEmail: "Missing required field: email.",
    invalidDate: "Invalid date format. Use YYYY-MM-DD.",
    invalidTime: "Invalid time format. Use HH:MM.",
    invalidEmail: "Invalid email address.",
    invalidPhone: "Invalid phone number.",
    weekendClosed: "We are closed on weekends.",
    pastDateTime: "Appointment date/time must be in the future.",
    serverError: "Unable to create appointment at the moment.",
    duplicate: "A similar appointment already exists.",
    confirmationTitle: "Appointment Confirmation",
    appointmentCreated: "Your appointment has been received.",
    referenceLabel: "Reference",
    businessLabel: "Business",
    nameLabel: "Name",
    phoneLabel: "Phone",
    emailLabel: "Email",
    dateLabel: "Date",
    timeLabel: "Time",
    serviceLabel: "Service",
    notesLabel: "Notes",
    languageLabel: "Language",
    timezoneLabel: "Timezone",
    sourceLabel: "Source",
  },
  fr: {
    success: "Le rendez-vous a été créé avec succès.",
    invalidMethod: "Méthode non autorisée.",
    invalidJson: "Corps JSON invalide.",
    missingName: "Champ obligatoire manquant : nom.",
    missingPhone: "Champ obligatoire manquant : téléphone.",
    missingDate: "Champ obligatoire manquant : date.",
    missingTime: "Champ obligatoire manquant : heure.",
    missingService: "Champ obligatoire manquant : service.",
    missingEmail: "Champ obligatoire manquant : courriel.",
    invalidDate: "Format de date invalide. Utilisez AAAA-MM-JJ.",
    invalidTime: "Format d'heure invalide. Utilisez HH:MM.",
    invalidEmail: "Adresse courriel invalide.",
    invalidPhone: "Numéro de téléphone invalide.",
    weekendClosed: "Nous sommes fermés les fins de semaine.",
    pastDateTime: "La date et l'heure du rendez-vous doivent être dans le futur.",
    serverError: "Impossible de créer le rendez-vous pour le moment.",
    duplicate: "Un rendez-vous semblable existe déjà.",
    confirmationTitle: "Confirmation de rendez-vous",
    appointmentCreated: "Votre rendez-vous a bien été reçu.",
    referenceLabel: "Référence",
    businessLabel: "Entreprise",
    nameLabel: "Nom",
    phoneLabel: "Téléphone",
    emailLabel: "Courriel",
    dateLabel: "Date",
    timeLabel: "Heure",
    serviceLabel: "Service",
    notesLabel: "Notes",
    languageLabel: "Langue",
    timezoneLabel: "Fuseau horaire",
    sourceLabel: "Source",
  },
};

function getLanguage(inputLang) {
  const lang = String(inputLang || "").toLowerCase();
  if (lang.startsWith("fr")) return "fr";
  return "en";
}

function t(lang, key) {
  return I18N[lang]?.[key] || I18N.en[key] || key;
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(payload),
  };
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return null;
  }
}

function sanitizeString(value, maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function isValidDateString(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(`${dateStr}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function isValidTimeString(timeStr) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(timeStr || ""));
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  const digitsOnly = normalized.replace(/[^\d]/g, "");
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

function isWeekend(dateStr, timezone) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  }).format(date);

  return weekday === "Sat" || weekday === "Sun";
}

function buildDateTimeString(date, time) {
  return `${date}T${time}:00`;
}

function isFutureDateTime(date, time) {
  const appointment = new Date(buildDateTimeString(date, time));
  return appointment.getTime() > Date.now();
}

function generateReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString().slice(-6);
  return `AIT-${stamp}-${random}`;
}

function normalizeService(service, lang) {
  const raw = sanitizeString(service, 100).toLowerCase();

  const map = {
    maintenance: { en: "Maintenance", fr: "Entretien" },
    entretien: { en: "Maintenance", fr: "Entretien" },
    repair: { en: "Repair", fr: "Réparation" },
    reparation: { en: "Repair", fr: "Réparation" },
    réparation: { en: "Repair", fr: "Réparation" },
    consultation: { en: "Consultation", fr: "Consultation" },
    diagnostic: { en: "Diagnostic", fr: "Diagnostic" },
    tire: { en: "Tire Service", fr: "Service de pneus" },
    pneus: { en: "Tire Service", fr: "Service de pneus" },
    "service advisor": { en: "Service Appointment", fr: "Rendez-vous service" },
    appointment: { en: "Appointment", fr: "Rendez-vous" },
  };

  if (map[raw]) {
    return lang === "fr" ? map[raw].fr : map[raw].en;
  }

  return sanitizeString(service, 100);
}

// Placeholder for future duplicate checking against DB/calendar/CRM.
async function checkForDuplicateAppointment() {
  return false;
}

// Placeholder for future persistence.
// Replace with DB, Airtable, Supabase, Google Sheets, CRM, etc.
async function saveAppointmentRecord(record) {
  console.log("AIT appointment created:", JSON.stringify(record, null, 2));
  return true;
}

// Placeholder for future email/SMS notifications.
async function sendNotifications(record) {
  if (DEFAULT_NOTIFICATION_EMAIL) {
    console.log(`Would notify ${DEFAULT_NOTIFICATION_EMAIL} for appointment ${record.reference}`);
  }

  if (record.email) {
    console.log(`Would send customer confirmation email to ${record.email}`);
  }

  if (record.phone) {
    console.log(`Would send SMS confirmation to ${record.phone}`);
  }

  return true;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    const lang = getLanguage(event?.queryStringParameters?.lang);
    return json(405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      language: lang,
      message: t(lang, "invalidMethod"),
    });
  }

  try {
    const body = safeJsonParse(event.body);

    if (!body) {
      return json(400, {
        ok: false,
        code: "INVALID_JSON",
        language: "en",
        message: t("en", "invalidJson"),
      });
    }

    const lang = getLanguage(body.lang || body.language);
    const timezone = sanitizeString(body.timezone || DEFAULT_TIMEZONE, 100);

    const name = sanitizeString(body.name, 120);
    const phone = sanitizeString(body.phone, 40);
    const email = sanitizeString(body.email, 150).toLowerCase();
    const date = sanitizeString(body.date, 20);
    const time = sanitizeString(body.time, 10);
    const service = sanitizeString(body.service, 100);
    const notes = sanitizeString(body.notes, 1000);
    const source = sanitizeString(body.source || "web", 50);
    const advisor = sanitizeString(body.advisor || "", 120);
    const vehicle = sanitizeString(body.vehicle || "", 120);

    if (!name) {
      return json(400, {
        ok: false,
        code: "MISSING_NAME",
        language: lang,
        message: t(lang, "missingName"),
      });
    }

    if (!phone) {
      return json(400, {
        ok: false,
        code: "MISSING_PHONE",
        language: lang,
        message: t(lang, "missingPhone"),
      });
    }

    if (DEFAULT_REQUIRE_EMAIL && !email) {
      return json(400, {
        ok: false,
        code: "MISSING_EMAIL",
        language: lang,
        message: t(lang, "missingEmail"),
      });
    }

    if (!date) {
      return json(400, {
        ok: false,
        code: "MISSING_DATE",
        language: lang,
        message: t(lang, "missingDate"),
      });
    }

    if (!time) {
      return json(400, {
        ok: false,
        code: "MISSING_TIME",
        language: lang,
        message: t(lang, "missingTime"),
      });
    }

    if (!service) {
      return json(400, {
        ok: false,
        code: "MISSING_SERVICE",
        language: lang,
        message: t(lang, "missingService"),
      });
    }

    if (!isValidDateString(date)) {
      return json(400, {
        ok: false,
        code: "INVALID_DATE",
        language: lang,
        message: t(lang, "invalidDate"),
      });
    }

    if (!isValidTimeString(time)) {
      return json(400, {
        ok: false,
        code: "INVALID_TIME",
        language: lang,
        message: t(lang, "invalidTime"),
      });
    }

    if (!isValidPhone(phone)) {
      return json(400, {
        ok: false,
        code: "INVALID_PHONE",
        language: lang,
        message: t(lang, "invalidPhone"),
      });
    }

    if (email && !isValidEmail(email)) {
      return json(400, {
        ok: false,
        code: "INVALID_EMAIL",
        language: lang,
        message: t(lang, "invalidEmail"),
      });
    }

    if (DEFAULT_BLOCK_WEEKENDS && isWeekend(date, timezone)) {
      return json(400, {
        ok: false,
        code: "WEEKEND_CLOSED",
        language: lang,
        message: t(lang, "weekendClosed"),
      });
    }

    if (!isFutureDateTime(date, time)) {
      return json(400, {
        ok: false,
        code: "PAST_DATETIME",
        language: lang,
        message: t(lang, "pastDateTime"),
      });
    }

    const duplicateExists = await checkForDuplicateAppointment({
      name,
      phone,
      email,
      date,
      time,
      service,
    });

    if (duplicateExists) {
      return json(409, {
        ok: false,
        code: "DUPLICATE_APPOINTMENT",
        language: lang,
        message: t(lang, "duplicate"),
      });
    }

    const reference = generateReference();
    const localizedService = normalizeService(service, lang);

    const record = {
      reference,
      businessName: DEFAULT_BUSINESS_NAME,
      language: lang,
      timezone,
      source,
      customer: {
        name,
        phone,
        phoneNormalized: normalizePhone(phone),
        email,
      },
      appointment: {
        date,
        time,
        datetimeLocal: buildDateTimeString(date, time),
        service: localizedService,
        notes,
        advisor,
        vehicle,
      },
      createdAt: new Date().toISOString(),
      status: "confirmed",
    };

    await saveAppointmentRecord(record);
    await sendNotifications(record);

    return json(200, {
      ok: true,
      code: "APPOINTMENT_CREATED",
      language: lang,
      message: t(lang, "success"),
      confirmation: {
        title: t(lang, "confirmationTitle"),
        subtitle: t(lang, "appointmentCreated"),
      },
      appointment: {
        reference: record.reference,
        businessName: record.businessName,
        name: record.customer.name,
        phone: record.customer.phone,
        email: record.customer.email,
        date: record.appointment.date,
        time: record.appointment.time,
        service: record.appointment.service,
        notes: record.appointment.notes,
        source: record.source,
        timezone: record.timezone,
        advisor: record.appointment.advisor,
        vehicle: record.appointment.vehicle,
        status: record.status,
      },
      labels: {
        reference: t(lang, "referenceLabel"),
        business: t(lang, "businessLabel"),
        name: t(lang, "nameLabel"),
        phone: t(lang, "phoneLabel"),
        email: t(lang, "emailLabel"),
        date: t(lang, "dateLabel"),
        time: t(lang, "timeLabel"),
        service: t(lang, "serviceLabel"),
        notes: t(lang, "notesLabel"),
        language: t(lang, "languageLabel"),
        timezone: t(lang, "timezoneLabel"),
        source: t(lang, "sourceLabel"),
      },
    });
  } catch (error) {
    console.error("create-appointment error:", error);

    const fallbackLang = "en";

    return json(500, {
      ok: false,
      code: "SERVER_ERROR",
      language: fallbackLang,
      message: t(fallbackLang, "serverError"),
    });
  }
}
