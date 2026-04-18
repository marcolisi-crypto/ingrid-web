import { getStore } from "@netlify/blobs";

const CONFIG_STORE = "config";
const APPOINTMENTS_STORE = "appointments";
const CUSTOMERS_STORE = "customers";

const SERVICE_TYPE_MAP = {
  oil_change: {
    en: "Oil Change",
    fr: "Changement d'huile",
    aliases: ["oil change", "changement d'huile", "vidange"]
  },
  tire_change: {
    en: "Tire Change",
    fr: "Changement de pneus",
    aliases: ["tire change", "changement de pneus", "pneus"]
  },
  maintenance: {
    en: "Maintenance",
    fr: "Entretien",
    aliases: ["maintenance", "entretien"]
  },
  brakes: {
    en: "Brakes",
    fr: "Freins",
    aliases: ["brakes", "freins"]
  },
  inspection: {
    en: "Inspection",
    fr: "Inspection",
    aliases: ["inspection"]
  }
};

const TRANSPORT_MAP = {
  waiting: {
    en: "Waiting",
    fr: "Attente",
    aliases: ["waiting", "attente"]
  },
  shuttle: {
    en: "Shuttle",
    fr: "Navette",
    aliases: ["shuttle", "navette"]
  },
  loaner: {
    en: "Loaner",
    fr: "Véhicule de courtoisie",
    aliases: ["loaner", "véhicule de courtoisie", "courtesy vehicle"]
  },
  drop_off: {
    en: "Drop Off",
    fr: "Déposer",
    aliases: ["drop off", "dropoff", "déposer"]
  }
};

function normalize(value = "") {
  return String(value).trim();
}

function normalizeLower(value = "") {
  return normalize(value).toLowerCase();
}

function normalizeDate(value = "") {
  return normalize(value);
}

function normalizeTime(value = "") {
  return normalize(value);
}

function normalizeLanguage(value = "") {
  const v = normalizeLower(value);
  if (v.startsWith("fr")) return "fr-CA";
  return "en-US";
}

function timeToMinutes(time) {
  const [h, m] = String(time).split(":").map(Number);
  return (h * 60) + m;
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function appointmentKey(date, time, advisor = "") {
  return `${date}__${time}__${advisor || "any"}`;
}

function getWeekdayName(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function findCanonicalKey(input, dictionary) {
  const value = normalizeLower(input);
  if (!value) return "";

  for (const [key, meta] of Object.entries(dictionary)) {
    if (key === value) return key;
    if (meta.aliases.some((alias) => normalizeLower(alias) === value)) return key;
    if (normalizeLower(meta.en) === value) return key;
    if (normalizeLower(meta.fr) === value) return key;
  }

  return value;
}

export function getLocalizedServiceLabel(key, language = "en-US") {
  const item = SERVICE_TYPE_MAP[key];
  if (!item) return key;
  return language.startsWith("fr") ? item.fr : item.en;
}

export function getLocalizedTransportLabel(key, language = "en-US") {
  const item = TRANSPORT_MAP[key];
  if (!item) return key;
  return language.startsWith("fr") ? item.fr : item.en;
}

export async function loadSchedulerConfig() {
  const store = getStore(CONFIG_STORE);
  const config = await store.get("scheduler", { type: "json" }).catch(() => null);

  return {
    slotDuration: Number(config?.slotDuration || 30),
    bufferMinutes: Number(config?.bufferMinutes || 0),
    maxBookingsPerSlot: Number(config?.maxBookingsPerSlot || 1),
    businessHours: config?.businessHours || {
      monday: ["08:00", "17:00"],
      tuesday: ["08:00", "17:00"],
      wednesday: ["08:00", "17:00"],
      thursday: ["08:00", "17:00"],
      friday: ["08:00", "14:30"],
      saturday: null,
      sunday: null
    },
    serviceTypes: config?.serviceTypes || Object.keys(SERVICE_TYPE_MAP),
    transportationOptions: config?.transportOptions || Object.keys(TRANSPORT_MAP),
    closedDates: config?.closedDates || [],
    advisors: config?.advisors || []
  };
}

export function buildSlotsForDate(dateStr, config, advisor = "") {
  if (!dateStr) return [];
  if (config.closedDates.includes(dateStr)) return [];

  const weekday = getWeekdayName(dateStr);
  const hours = config.businessHours?.[weekday];
  if (!hours || !Array.isArray(hours) || hours.length < 2) return [];

  const [start, end] = hours;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  const slots = [];
  for (let t = startMin; t + config.slotDuration <= endMin; t += config.slotDuration) {
    slots.push({
      date: dateStr,
      time: minutesToTime(t),
      advisor: advisor || "",
      label: minutesToTime(t)
    });
  }

  return slots;
}

export async function listAppointments() {
  const store = getStore(APPOINTMENTS_STORE);
  const { blobs } = await store.list();
  const rows = [];

  for (const blob of blobs) {
    const item = await store.get(blob.key, { type: "json" }).catch(() => null);
    if (item) rows.push(item);
  }

  return rows;
}

export async function getAvailableSlots({ date, advisor = "" }) {
  const config = await loadSchedulerConfig();
  const allSlots = buildSlotsForDate(date, config, advisor);
  const appointments = await listAppointments();

  const counts = new Map();

  for (const appt of appointments) {
    if (appt.date !== date) continue;
    const key = appointmentKey(appt.date, appt.time, appt.advisor || "");
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return allSlots.filter((slot) => {
    const key = appointmentKey(slot.date, slot.time, slot.advisor || "");
    return (counts.get(key) || 0) < config.maxBookingsPerSlot;
  });
}

async function upsertCustomer(appointment) {
  const phoneKey = normalize(appointment.phone).replace(/\D/g, "");
  if (!phoneKey) return;

  const store = getStore(CUSTOMERS_STORE);
  const existing = await store.get(phoneKey, { type: "json" }).catch(() => null);

  const vehicle = {
    make: appointment.make,
    model: appointment.model,
    year: appointment.year,
    vin: appointment.vin
  };

  const vehicles = Array.isArray(existing?.vehicles) ? existing.vehicles : [];
  const hasVehicle = vehicles.some((v) =>
    String(v.vin || "").trim() &&
    String(v.vin || "").trim() === String(vehicle.vin || "").trim()
  );

  const customer = {
    phone: appointment.phone,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    email: appointment.email,
    preferredLanguage: appointment.language,
    vehicles: hasVehicle || !vehicle.vin ? vehicles : [...vehicles, vehicle],
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  await store.setJSON(phoneKey, customer);
}

export async function createAppointment(payload) {
  const serviceTypeKey = findCanonicalKey(payload.serviceType, SERVICE_TYPE_MAP);
  const transportationKey = findCanonicalKey(payload.transportation, TRANSPORT_MAP);
  const language = normalizeLanguage(payload.language || payload.lang || "en-US");

  const appointment = {
    id: crypto.randomUUID(),
    firstName: normalize(payload.firstName),
    lastName: normalize(payload.lastName),
    phone: normalize(payload.phone),
    email: normalize(payload.email),
    make: normalize(payload.make),
    model: normalize(payload.model),
    year: normalize(payload.year),
    vin: normalize(payload.vin),
    mileage: normalize(payload.mileage),
    serviceType: serviceTypeKey,
    serviceTypeLabel: getLocalizedServiceLabel(serviceTypeKey, language),
    advisor: normalize(payload.advisor),
    date: normalizeDate(payload.date),
    time: normalizeTime(payload.time),
    transportation: transportationKey,
    transportationLabel: getLocalizedTransportLabel(transportationKey, language),
    notes: normalize(payload.notes),
    source: normalize(payload.source || "internal"),
    language,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!appointment.firstName || !appointment.lastName || !appointment.phone) {
    throw new Error(
      language.startsWith("fr")
        ? "Informations client manquantes"
        : "Missing customer details"
    );
  }

  if (!appointment.date || !appointment.time) {
    throw new Error(
      language.startsWith("fr")
        ? "Plage horaire manquante"
        : "Missing appointment slot"
    );
  }

  const available = await getAvailableSlots({
    date: appointment.date,
    advisor: appointment.advisor
  });

  const slotStillOpen = available.some(
    (slot) => slot.date === appointment.date && slot.time === appointment.time
  );

  if (!slotStillOpen) {
    throw new Error(
      language.startsWith("fr")
        ? "La plage horaire choisie n'est plus disponible"
        : "Selected slot is no longer available"
    );
  }

  const store = getStore(APPOINTMENTS_STORE);
  await store.setJSON(appointment.id, appointment);

  await upsertCustomer(appointment);

  return appointment;
}
