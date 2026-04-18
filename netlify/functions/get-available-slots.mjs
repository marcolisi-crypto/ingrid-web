// netlify/functions/get-available-slots.mjs

const DEFAULT_TIMEZONE = process.env.BOOKING_TIMEZONE || "America/Toronto";
const DEFAULT_SLOT_INTERVAL_MIN = Number(process.env.SLOT_INTERVAL_MIN || 30);
const DEFAULT_APPOINTMENT_DURATION_MIN = Number(process.env.APPOINTMENT_DURATION_MIN || 30);
const DEFAULT_OPEN_HOUR = Number(process.env.BUSINESS_OPEN_HOUR || 8);   // 8:00
const DEFAULT_CLOSE_HOUR = Number(process.env.BUSINESS_CLOSE_HOUR || 17); // 17:00
const DEFAULT_BLOCK_WEEKENDS = String(process.env.BLOCK_WEEKENDS || "true").toLowerCase() === "true";

// Optional comma-separated blocked times per day, ex: "12:00,12:30"
// You can also override dynamically in the request body/query.
const DEFAULT_BLOCKED_TIMES = (process.env.DEFAULT_BLOCKED_TIMES || "12:00")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const I18N = {
  en: {
    success: "Available slots loaded successfully.",
    missingDate: "Missing required field: date.",
    invalidDate: "Invalid date format. Use YYYY-MM-DD.",
    weekendClosed: "We are closed on weekends.",
    noSlots: "No available time slots for this date.",
    serverError: "Unable to load available slots at the moment.",
    availableSlots: "Available slots",
    timezoneLabel: "Timezone",
    languageLabel: "Language",
    closed: "Closed",
  },
  fr: {
    success: "Les plages horaires disponibles ont été chargées avec succès.",
    missingDate: "Champ obligatoire manquant : date.",
    invalidDate: "Format de date invalide. Utilisez AAAA-MM-JJ.",
    weekendClosed: "Nous sommes fermés les fins de semaine.",
    noSlots: "Aucune plage horaire disponible pour cette date.",
    serverError: "Impossible de charger les plages horaires pour le moment.",
    availableSlots: "Plages horaires disponibles",
    timezoneLabel: "Fuseau horaire",
    languageLabel: "Langue",
    closed: "Fermé",
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(payload),
  };
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function isValidDateString(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function getWeekdayInTimezone(dateStr, timezone) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  }).format(date);

  return weekday; // Sun, Mon, Tue...
}

function isWeekend(dateStr, timezone) {
  const weekday = getWeekdayInTimezone(dateStr, timezone);
  return weekday === "Sat" || weekday === "Sun";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function parseBlockedTimes(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function formatSlotLabel(hhmm, lang) {
  const [hour, minute] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildSlots({
  date,
  lang,
  timezone,
  openHour,
  closeHour,
  intervalMin,
  durationMin,
  blockedTimes,
}) {
  const startMin = openHour * 60;
  const endMin = closeHour * 60;
  const blockedSet = new Set(blockedTimes);

  const slots = [];

  for (let current = startMin; current + durationMin <= endMin; current += intervalMin) {
    const hhmm = toHHMM(current);
    if (blockedSet.has(hhmm)) continue;

    slots.push({
      value: hhmm,
      label: formatSlotLabel(hhmm, lang),
      datetime_local: `${date}T${hhmm}:00`,
      available: true,
    });
  }

  return slots;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    const query = event.queryStringParameters || {};
    const body = safeJsonParse(event.body);

    const input = {
      ...query,
      ...body,
    };

    const lang = getLanguage(input.lang || input.language);
    const timezone = input.timezone || DEFAULT_TIMEZONE;
    const date = input.date;

    if (!date) {
      return json(400, {
        ok: false,
        code: "MISSING_DATE",
        language: lang,
        message: t(lang, "missingDate"),
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

    const blockWeekends =
      typeof input.blockWeekends !== "undefined"
        ? String(input.blockWeekends).toLowerCase() === "true"
        : DEFAULT_BLOCK_WEEKENDS;

    if (blockWeekends && isWeekend(date, timezone)) {
      return json(200, {
        ok: true,
        language: lang,
        date,
        timezone,
        slots: [],
        message: t(lang, "weekendClosed"),
        closed: true,
      });
    }

    const openHour = Number.isFinite(Number(input.openHour))
      ? Number(input.openHour)
      : DEFAULT_OPEN_HOUR;

    const closeHour = Number.isFinite(Number(input.closeHour))
      ? Number(input.closeHour)
      : DEFAULT_CLOSE_HOUR;

    const intervalMin = Number.isFinite(Number(input.intervalMin))
      ? Number(input.intervalMin)
      : DEFAULT_SLOT_INTERVAL_MIN;

    const durationMin = Number.isFinite(Number(input.durationMin))
      ? Number(input.durationMin)
      : DEFAULT_APPOINTMENT_DURATION_MIN;

    const blockedTimes = [
      ...DEFAULT_BLOCKED_TIMES,
      ...parseBlockedTimes(input.blockedTimes),
    ];

    const uniqueBlockedTimes = [...new Set(blockedTimes)].filter((hhmm) => {
      const mins = toMinutes(hhmm);
      return mins !== null;
    });

    const slots = buildSlots({
      date,
      lang,
      timezone,
      openHour,
      closeHour,
      intervalMin,
      durationMin,
      blockedTimes: uniqueBlockedTimes,
    });

    return json(200, {
      ok: true,
      language: lang,
      date,
      timezone,
      businessHours: {
        open: `${pad2(openHour)}:00`,
        close: `${pad2(closeHour)}:00`,
      },
      slotIntervalMin: intervalMin,
      appointmentDurationMin: durationMin,
      blockedTimes: uniqueBlockedTimes,
      slots,
      count: slots.length,
      message: slots.length ? t(lang, "success") : t(lang, "noSlots"),
      labels: {
        availableSlots: t(lang, "availableSlots"),
        timezone: t(lang, "timezoneLabel"),
        language: t(lang, "languageLabel"),
        closed: t(lang, "closed"),
      },
    });
  } catch (error) {
    console.error("get-available-slots error:", error);

    const lang = getLanguage(
      event?.queryStringParameters?.lang ||
      safeJsonParse(event?.body)?.lang ||
      "en"
    );

    return json(500, {
      ok: false,
      code: "SERVER_ERROR",
      language: lang,
      message: t(lang, "serverError"),
    });
  }
}
