let selectedCallSid = null;
let currentCalls = [];
let currentRows = [];
let currentInboxConversations = [];
let currentTasks = [];
let currentAppointments = [];
let currentRepairOrders = [];
let currentMediaAssets = [];
let currentPartOrders = [];
let currentAccountsPayableBills = [];
let currentAccountsReceivableInvoices = [];
let currentCustomers = [];
let currentVehicles = [];
let currentCustomerNotes = [];
let currentCustomerTimeline = [];
let selectedCustomerId = "";
let isLoadingInbox = false;
let readMap = JSON.parse(localStorage.getItem("readConversations") || "{}");
let activeDepartmentFilter = "all";
let currentConversationPhone = "";
let schedulerConfigCache = null;
let configCache = null;
let isLoadingCalls = false;
let isLoadingCustomer360 = false;
let currentDepartmentLens = "home";
let currentCustomer360TimelineCards = [];
let currentCustomer360TimelineFilter = "all";
let currentCustomer360VinFilter = "all";
let currentCustomer360ComposerMode = "note";
let currentCustomer360Focus = null;
let currentJourneyArtifacts = {};
let currentJourneyFeedbackMessage = "";
let currentJourneyFeedbackStage = "";
let currentJourneyFeedbackTimer = null;
let customer360AssigneeMap = JSON.parse(localStorage.getItem("customer360Assignees") || "{}");
let currentManagerQueueSort = localStorage.getItem("customer360ManagerQueueSort") || "urgent";
let customer360TaskQueueOwners = JSON.parse(localStorage.getItem("customer360TaskQueueOwners") || "{}");
let customer360QueueFilters = JSON.parse(localStorage.getItem("customer360QueueFilters") || "{}");

const JOURNEY_ASSIGNEE_DIRECTORY = {
  bdc: ["Rachel Smith", "Nicole Adams", "BDC Queue"],
  sales: ["Jordan Blake", "Sales Desk", "Floor Manager"],
  service: ["Rachel Smith", "Nicole Adams", "Front Desk"],
  technicians: ["Miguel Santos", "Avery Chen", "Shop Foreman"],
  fi: ["Priya Shah", "Finance Desk", "Funding Manager"],
  delivery: ["Guest Experience", "Delivery Desk", "Sales Desk"],
  parts: ["Marcus Reed", "Inventory Desk", "Runner Dispatch"],
  accounting: ["Priya Shah", "Back Office", "Finance Desk"]
};

function normalizeDepartmentKey(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "f&i" || normalized === "fi" || normalized === "finance") return "fi";
  if (normalized === "service advisor") return "service";
  if (normalized === "technician") return "technicians";
  return normalized;
}

function getDepartmentRoster(department = "") {
  return JOURNEY_ASSIGNEE_DIRECTORY[normalizeDepartmentKey(department)] || [];
}

function saveCustomer360TaskQueueOwners(map) {
  customer360TaskQueueOwners = map || {};
  localStorage.setItem("customer360TaskQueueOwners", JSON.stringify(customer360TaskQueueOwners));
}

function saveCustomer360QueueFilters(map) {
  customer360QueueFilters = map || {};
  localStorage.setItem("customer360QueueFilters", JSON.stringify(customer360QueueFilters));
}

function getTaskAssignedDepartment(task = {}) {
  const explicit = normalizeDepartmentKey(task.assignedDepartment || "");
  if (explicit) return explicit;
  return normalizeDepartmentKey(inferJourneyHandoffTarget(task.title || "", task.description || "") || "");
}

function getTaskAssignedUser(task = {}) {
  return String(task.assignedUser || "").trim();
}

const DEPARTMENT_LENSES = {
  home: { name: "DMS Home", copy: "Customer + Vehicle 360 remains the core operating screen for every department.", summaryTitle: "AI Summary", timelineLabel: "All departments", actions: ["New Deal", "Create Appointment", "Add Note"], dashboardTitle: "Customer 360° Dashboard", lensPanelTitle: "Work Queue", primaryPanelTitle: "Tasks", secondaryPanelTitle: "Notes", railTitle: "Service + Loaner", archiveTitle: "VIN Archive", defaultFilter: "all", composerMode: "note" },
  sales: { name: "Sales", copy: "Lead, quote, trade, and deal actions stay anchored to the same customer and vehicle timeline.", summaryTitle: "Sales Summary", timelineLabel: "Sales lens", actions: ["Start Deal", "Log Test Drive", "Send Quote"], dashboardTitle: "Sales 360°", lensPanelTitle: "Opportunity", primaryPanelTitle: "Opportunity Tasks", secondaryPanelTitle: "Deal Notes", railTitle: "Sales Desk", archiveTitle: "Deal Jacket", defaultFilter: "tasks", composerMode: "task" },
  service: { name: "Service Advisor", copy: "Appointments, repair orders, vehicle history, and follow-ups stay centered on the 360 view.", summaryTitle: "Service Summary", timelineLabel: "Service lens", actions: ["Schedule Service", "Write RO", "Add Advisor Note"], dashboardTitle: "Service Advisor 360°", lensPanelTitle: "RO-Lite", primaryPanelTitle: "Lane Tasks", secondaryPanelTitle: "Advisor Notes", railTitle: "Service Lane", archiveTitle: "VIN Archive", defaultFilter: "appointments", composerMode: "appointment" },
  bdc: { name: "BDC", copy: "Inbound calls, SMS, queues, and campaign follow-ups work from the same contact record.", summaryTitle: "BDC Summary", timelineLabel: "BDC lens", actions: ["Open Call Queue", "Send Follow-up", "Start Campaign"], dashboardTitle: "BDC 360°", lensPanelTitle: "Queue", primaryPanelTitle: "Follow-Ups", secondaryPanelTitle: "Conversation Notes", railTitle: "Communications Queue", archiveTitle: "Customer Files", defaultFilter: "calls", composerMode: "task" },
  technicians: { name: "Technicians", copy: "Open jobs, inspection updates, and technician notes remain linked to the customer and VIN timeline.", summaryTitle: "Tech Summary", timelineLabel: "Technician lens", actions: ["Start Job", "Complete Job", "Add Internal Note"], dashboardTitle: "Technician 360°", lensPanelTitle: "Work Order", primaryPanelTitle: "Job Tasks", secondaryPanelTitle: "Inspection Notes", railTitle: "Work Bay", archiveTitle: "VIN Archive", defaultFilter: "tasks", composerMode: "note" },
  fi: { name: "F&I", copy: "Deal closing, products, and funding context stay attached to the same operating record.", summaryTitle: "F&I Summary", timelineLabel: "F&I lens", actions: ["Add Warranty", "Finalize Deal", "Print Docs"], dashboardTitle: "F&I 360°", lensPanelTitle: "Funding", primaryPanelTitle: "Closing Tasks", secondaryPanelTitle: "Funding Notes", railTitle: "Delivery Desk", archiveTitle: "Deal Jacket", defaultFilter: "tasks", composerMode: "task" },
  parts: { name: "Parts", copy: "Parts demand, special orders, and vehicle-linked parts history remain connected to service work.", summaryTitle: "Parts Summary", timelineLabel: "Parts lens", actions: ["Order Part", "Assign to RO", "Check Availability"], dashboardTitle: "Parts 360°", lensPanelTitle: "Parts Request", primaryPanelTitle: "Parts Tasks", secondaryPanelTitle: "Order Notes", railTitle: "Parts Runner", archiveTitle: "VIN Archive", defaultFilter: "activity", composerMode: "task" },
  accounting: { name: "Accounting", copy: "Invoices, payouts, and payment events will surface against the same customer and vehicle timeline.", summaryTitle: "Accounting Summary", timelineLabel: "Accounting lens", actions: ["Post Payment", "Review Invoice", "Export Statement"], dashboardTitle: "Accounting 360°", lensPanelTitle: "Ledger", primaryPanelTitle: "Accounting Tasks", secondaryPanelTitle: "Ledger Notes", railTitle: "Payment Desk", archiveTitle: "Financial File", defaultFilter: "activity", composerMode: "note" },
  executive: { name: "Executive", copy: "Executives can review performance while still drilling back into the underlying customer and vehicle record.", summaryTitle: "Executive Summary", timelineLabel: "Executive lens", actions: ["View KPIs", "Open Forecast", "Review Pipeline"], dashboardTitle: "Executive 360°", lensPanelTitle: "Scorecard", primaryPanelTitle: "Strategic Tasks", secondaryPanelTitle: "Leadership Notes", railTitle: "Performance Snapshot", archiveTitle: "Executive File", defaultFilter: "all", composerMode: "note" },
  settings: { name: "Settings", copy: "Role-based menus, permissions, defaults, and store-level configuration will lock this shell down later.", summaryTitle: "Settings Summary", timelineLabel: "Settings lens", actions: ["Manage Roles", "Update Defaults", "Review Access"], dashboardTitle: "Settings 360°", lensPanelTitle: "Policy", primaryPanelTitle: "Role Tasks", secondaryPanelTitle: "Config Notes", railTitle: "Access Control", archiveTitle: "Platform Archive", defaultFilter: "activity", composerMode: "note" }
};

const COMM_SCRIPT_LIBRARY = [
  {
    id: "service-reminder",
    name: "Service Reminder",
    department: "service",
    description: "One-off AI outbound reminder for due service or maintenance follow-up."
  },
  {
    id: "sales-followup",
    name: "Sales Follow-up",
    department: "sales",
    description: "Re-engage an individual sales lead with a guided AI script."
  },
  {
    id: "appointment-recovery",
    name: "Missed Appointment Recovery",
    department: "service",
    description: "Call a customer back after a missed or abandoned booking attempt."
  }
];

const commsState = {
  isOpen: false,
  mode: "messages",
  search: "",
  selectedPhone: "",
  selectedContact: null,
  activeMessages: [],
  smsDraft: "",
  smsStatus: "",
  call: {
    status: "Phone backend not configured yet",
    lastAction: "",
    dialing: false,
  },
  scripted: {
    scriptId: COMM_SCRIPT_LIBRARY[0].id,
    notes: "",
    status: "",
    running: false,
  },

};

let twilioDevice = null;
let activeTwilioCall = null;
let twilioReady = false;
let twilioMuted = false;
let twilioRegisterPromise = null;
let twilioIdentity = "frontdesk-1";

function getInboxReadMap() {
  try {
    return JSON.parse(localStorage.getItem("readConversations") || "{}");
  } catch {
    return {};
  }
}

function saveInboxReadMap(map) {
  readMap = map || {};
  localStorage.setItem("readConversations", JSON.stringify(readMap));
}

function saveJourneyAssigneeMap(map) {
  customer360AssigneeMap = map || {};
  localStorage.setItem("customer360Assignees", JSON.stringify(customer360AssigneeMap));
}

function markConversationRead(phone, timestamp = new Date().toISOString()) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return;
  const map = getInboxReadMap();
  map[normalized] = timestamp;
  saveInboxReadMap(map);
}

function getLatestIncomingTimestamp(messages = [], phone = "") {
  const normalizedPhone = normalizePhoneNumber(phone);
  const incoming = (messages || [])
    .filter((msg) => isIncomingMessage(msg, normalizedPhone) && msg.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return incoming[0]?.timestamp || "";
}

function updateInboxUnreadBadge() {
  const unreadCount = (currentInboxConversations || []).filter((item) => item.unread).length;
  const badge = document.getElementById("inboxUnreadBadge");
  if (badge) {
    badge.textContent = unreadCount ? String(unreadCount) : "";
    badge.style.display = unreadCount ? "inline-flex" : "none";
  }
  const dockBadge = document.getElementById("commsUnreadBadgeDock");
  if (dockBadge) {
    dockBadge.textContent = unreadCount ? `${unreadCount} unread` : "";
    dockBadge.style.display = unreadCount ? "inline-flex" : "none";
  }
  const dockToggle = document.getElementById("commsDockToggle");
  if (dockToggle) {
    dockToggle.classList.toggle("unread-pulse", unreadCount > 0);
  }
}

async function initTwilioDevice(forceRefresh = false) {
  if (typeof Twilio === "undefined" || !Twilio?.Device) {
    setCommsCallStatus("Voice SDK missing", "Load the Twilio Voice SDK script before app.js");
    throw new Error("Twilio Voice SDK is not loaded.");
  }

  if (twilioDevice && !forceRefresh) return twilioDevice;
  if (twilioRegisterPromise && !forceRefresh) return twilioRegisterPromise;

  twilioRegisterPromise = (async () => {
    setCommsCallStatus("Initializing", "Requesting browser voice token...");

    const res = await fetch("/.netlify/functions/voice-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      throw new Error(data.error || data.message || "Failed to get voice token.");
    }

    twilioIdentity = data.identity || twilioIdentity;

    if (twilioDevice && forceRefresh) {
      try { twilioDevice.destroy(); } catch {}
      twilioDevice = null;
    }

    twilioDevice = new Twilio.Device(data.token, {
      logLevel: 1,
      codecPreferences: ["opus", "pcmu"],
      fakeLocalDTMF: true,
      answerOnBridge: true
    });

    twilioDevice.on("registered", () => {
      twilioReady = true;
      setCommsCallStatus("Ready", `Browser registered as ${twilioIdentity}`);
      renderCommsDock();
    });

    twilioDevice.on("unregistered", () => {
      twilioReady = false;
      setCommsCallStatus("Offline", "Browser device unregistered");
      renderCommsDock();
    });

    twilioDevice.on("error", (error) => {
      console.error("Twilio device error:", error);
      twilioReady = false;
      setCommsCallStatus("Error", error?.message || "Twilio device error");
      renderCommsDock();
    });

    twilioDevice.on("incoming", (call) => {
      console.log("🔥 Incoming browser call:", call);

      activeTwilioCall = call;
      twilioMuted = false;
      openCommsDock({ mode: "dialer" });

      try {
        call.accept();
      } catch (err) {
        console.error("Auto-answer failed:", err);
      }

      setCommsCallStatus("Active", "Incoming browser leg auto-accepted");
      renderCommsDock();

      call.on("accept", () => {
        setCommsCallStatus("Connected", "Call accepted in browser");
        renderCommsDock();
      });

      call.on("disconnect", () => {
        activeTwilioCall = null;
        twilioMuted = false;
        setCommsCallStatus("Ended", "Call disconnected");
        renderCommsDock();
      });

      call.on("cancel", () => {
        activeTwilioCall = null;
        twilioMuted = false;
        setCommsCallStatus("Missed", "Incoming call canceled");
        renderCommsDock();
      });
    });

    await twilioDevice.register();
    return twilioDevice;
  })();

  try {
    return await twilioRegisterPromise;
  } finally {
    twilioRegisterPromise = null;
  }
}


const DEFAULT_TAGS = ["phone"];

const DEFAULT_VOICE_TEMPLATE = `Bonjour {{first_name}}, ici BMW MINI Laval.

Nous vous contactons au sujet de votre véhicule.
Selon notre dossier, un entretien pourrait être dû prochainement.

Souhaitez-vous prendre un rendez-vous?

Hello {{first_name}}, this is BMW MINI Laval.

We are contacting you regarding your vehicle.
According to our records, maintenance may be due soon.

Would you like to schedule an appointment?`;

const DEFAULT_SMS_TEMPLATE = `Bonjour {{first_name}}, ceci est BMW MINI Laval. Votre {{make}} {{model}} {{year}} est dû pour un service ({{service_due}}). Répondez à ce message ou appelez-nous pour prendre rendez-vous.

Hello {{first_name}}, this is BMW MINI Laval. Your {{make}} {{model}} {{year}} is due for service ({{service_due}}). Reply to this message or call us to book an appointment.`;

const DEFAULT_CONFIG = {
  general: {
    businessName: "Automotive Intelligence Technologies",
    defaultLanguage: "fr-CA",
    timezone: "America/Montreal",
    demoMode: "true"
  },
  users: [
    { name: "Admin", email: "admin@example.com", role: "Admin", active: true, permissions: "all" }
  ],
  advisors: [
    { name: "First Available", department: "service", email: "", extension: "", active: true, bookableOnline: true, color: "#2563eb" }
  ],
  scheduler: {
    slotDuration: 30,
    bufferMinutes: 0,
    maxBookingsPerSlot: 2,
    businessHours: {
      monday: "07:30-17:00",
      tuesday: "07:30-17:00",
      wednesday: "07:30-17:00",
      thursday: "07:30-17:00",
      friday: "07:30-17:00"
    },
    serviceTypes: [
      "Oil Change",
      "Brake Service",
      "Tire Change",
      "Tire Storage",
      "Recall Check",
      "Diagnostic",
      "Maintenance",
      "Other"
    ],
    transportOptions: [
      "Wait",
      "Shuttle",
      "Drop-Off",
      "Loaner Request"
    ],
    closedDates: []
  },
  twilio: {
    accountSid: "",
    authToken: "",
    smsNumber: "",
    voiceNumber: "",
    smsWebhook: "",
    voiceWebhook: "",
    recordingCallback: "",
    transcriptionCallback: ""
  },
  aiReception: {
    backendUrl: "",
    humanFallback: "",
    bdcFallback: "",
    outboundRoute: "",
    greetingFr: "",
    greetingEn: "",
    routingRules: {}
  },
  fortellis: {
    environment: "",
    baseUrl: "",
    clientId: "",
    clientSecret: "",
    subscriptionKey: "",
    dealerId: "",
    redirectUrl: "",
    scopes: ""
  },
  phoneNumbers: {
    main: "",
    service: "",
    sales: "",
    parts: "",
    bdc: "",
    finance: "",
    collision: "",
    twilioSms: "",
    twilioVoice: ""
  }
};

function formatDisplayDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function customerDisplayName(customer) {
  return String(customer?.fullName || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Unnamed Customer");
}

function vehicleDisplayName(vehicle) {
  if (!vehicle) return "No linked vehicle";
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || vehicle.vin || "Vehicle record";
}

function customerInitials(customer) {
  const source = customerDisplayName(customer)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "");
  return source.join("") || "CU";
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatMoney(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "$0.00";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function titleCase(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toLocalDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const tzOffset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
}

function toDateInputValue(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCustomerVehicleMatches(customer) {
  if (!customer) return [];
  const vehicleIds = Array.isArray(customer.vehicleIds) ? customer.vehicleIds : [];
  return currentVehicles.filter((vehicle) => vehicleIds.includes(vehicle.id));
}

function getSelectedCustomerRecord() {
  return currentCustomers.find((item) => item.id === selectedCustomerId) || null;
}

function getSelectedVehicleRecord() {
  return getCustomerPrimaryVehicle(getSelectedCustomerRecord());
}

function normalizeCustomer360TimelineFilter(value = "") {
  return String(value || "all").toLowerCase().trim();
}

function categorizeCustomer360TimelineItem(item) {
  const type = String(item.type || "").toLowerCase();
  const eventType = String(item.eventType || "").toLowerCase();

  if (type.includes("phone") || type.includes("call") || eventType.includes("call")) return "calls";
  if (type.includes("sms") || eventType.includes("sms") || eventType.includes("message")) return "sms";
  if (eventType.includes("journey_assignment")) return "activity";
  if (eventType.includes("vehicle_health") || eventType.includes("vehicle_movement") || eventType.includes("vin_archive")) return "vin";
  if (type.includes("vehicle health") || type.includes("vehicle movement") || type.includes("vin archive")) return "vin";
  if (type.includes("note") || type.includes("transcript") || eventType.includes("note")) return "notes";
  if (type.includes("task") || eventType.includes("task")) return "tasks";
  if (type.includes("appointment") || type.includes("service event") || eventType.includes("appointment")) return "appointments";
  return "activity";
}

function getCustomer360ComposerButtonLabel(mode = "note") {
  if (mode === "task") return "Create Task";
  if (mode === "appointment") return "Schedule Service";
  return "Save Note";
}

function getCustomer360ComposerCopy(mode = "note") {
  if (mode === "task") return "Create a follow-up task tied directly to this customer, vehicle, and timeline.";
  if (mode === "appointment") return "Book the next service touchpoint from the operating screen without losing customer context.";
  return "Capture a customer or advisor note directly into the VIN-linked record.";
}

function inferVehicleGeoLabel(vehicle, customer) {
  if (!vehicle && !customer) return "Location unavailable";
  const seed = `${vehicle?.vin || ""}${customer?.id || ""}`.length;
  const zones = ["Front Line North", "Service Lane 2", "Loaner Row", "Photo Bay", "Overflow West"];
  return zones[seed % zones.length];
}

function getTaggedTimelinePresentation(body = "", fallbackType = "Note", fallbackSubcopy = "Internal", explicitEventType = "") {
  const normalized = String(body || "").toLowerCase();
  const normalizedEventType = String(explicitEventType || "").toLowerCase();
  if (normalizedEventType === "vehicle_health") {
    return {
      type: "Vehicle Health",
      body: String(body || "").trim(),
      subcopy: "Vehicle intelligence"
    };
  }
  if (normalizedEventType === "vehicle_movement") {
    return {
      type: "Vehicle Movement",
      body: String(body || "").trim(),
      subcopy: "Vehicle location flow"
    };
  }
  if (normalizedEventType === "vin_archive") {
    return {
      type: "VIN Archive",
      body: String(body || "").trim(),
      subcopy: "VIN-specific record"
    };
  }
  if (normalized.startsWith("[vehicle]")) {
    const cleanedBody = String(body || "").replace(/\[vehicle\]\s*/i, "").trim();
    const isMovement = cleanedBody.toLowerCase().includes("geo / movement update") || cleanedBody.toLowerCase().includes("current zone");
    return {
      type: isMovement ? "Vehicle Movement" : "Vehicle Health",
      body: cleanedBody,
      subcopy: isMovement ? "Vehicle location flow" : "Vehicle intelligence"
    };
  }
  if (normalized.startsWith("[archive]")) {
    return {
      type: "VIN Archive",
      body: String(body || "").replace(/\[archive\]\s*/i, "").trim(),
      subcopy: "VIN-specific record"
    };
  }
  return {
    type: fallbackType,
    body: String(body || "").trim(),
    subcopy: fallbackSubcopy
  };
}

function getLatestTaggedArtifact(prefix = "", notes = [], timeline = []) {
  const normalizedPrefix = String(prefix || "").toLowerCase();
  const combined = [
    ...timeline.map((item) => ({
      id: item.id || item.timelineEventId || item.createdAtUtc || item.title || "timeline",
      body: item.body || "",
      occurredAtUtc: item.occurredAtUtc || item.createdAtUtc || "",
      source: "timeline"
    })),
    ...notes.map((item) => ({
      id: item.id || item.noteId || item.createdAtUtc || item.body || "note",
      body: item.body || "",
      occurredAtUtc: item.updatedAtUtc || item.createdAtUtc || "",
      source: "note"
    }))
  ];

  return combined
    .filter((item) => String(item.body || "").trim().toLowerCase().startsWith(normalizedPrefix))
    .sort((a, b) => new Date(b.occurredAtUtc || 0).getTime() - new Date(a.occurredAtUtc || 0).getTime())[0] || null;
}

function buildVehicleJourneyState(notes = [], tasks = [], appointments = []) {
  const latestVehicleArtifact = getLatestTaggedArtifact("[vehicle]", notes, currentCustomerTimeline || []);
  const latestArchiveArtifact = getLatestTaggedArtifact("[archive]", notes, currentCustomerTimeline || []);
  const latestVehiclePresentation = latestVehicleArtifact
    ? getTaggedTimelinePresentation(latestVehicleArtifact.body || "", "Vehicle Health", "Vehicle intelligence")
    : null;
  const hasHealth = !!latestVehicleArtifact && latestVehiclePresentation?.type === "Vehicle Health";
  const hasMovement = !!latestVehicleArtifact && latestVehiclePresentation?.type === "Vehicle Movement";
  const hasService = appointments.length > 0 || tasks.some((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes("[service]") || haystack.includes("loaner") || haystack.includes("transport");
  });
  const hasArchive = !!latestArchiveArtifact;
  const stageStates = [
    { key: "health", label: "Health", active: hasHealth, detail: hasHealth ? "Signal captured" : "Waiting for signal" },
    { key: "movement", label: "Movement", active: hasMovement, detail: hasMovement ? "Vehicle moving" : "Location steady" },
    { key: "service", label: "Service", active: hasService, detail: hasService ? "Lane work active" : "No lane workflow yet" },
    { key: "archive", label: "Archive", active: hasArchive, detail: hasArchive ? "VIN evidence added" : "No archive update yet" }
  ];
  const activeCount = stageStates.filter((item) => item.active).length;
  return {
    stages: stageStates,
    percent: Math.round((activeCount / stageStates.length) * 100),
    current: stageStates.filter((item) => item.active).slice(-1)[0] || stageStates[0]
  };
}

function openVehicleJourneyStage(stageKey = "health") {
  const tasks = (currentTasks || []).filter((task) => task.customerId === selectedCustomerId);
  const appointments = (currentAppointments || []).filter((item) => item.customerId === selectedCustomerId);
  const latestVehicleArtifact = getLatestTaggedArtifact("[vehicle]", currentCustomerNotes, currentCustomerTimeline || []);
  const latestArchiveArtifact = getLatestTaggedArtifact("[archive]", currentCustomerNotes, currentCustomerTimeline || []);
  const latestVehiclePresentation = latestVehicleArtifact
    ? getTaggedTimelinePresentation(latestVehicleArtifact.body || "", "Vehicle Health", "Vehicle intelligence")
    : null;
  const loanerTask = tasks.find((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes("loaner") || haystack.includes("transport");
  });

  if (stageKey === "health" && latestVehicleArtifact && latestVehiclePresentation?.type === "Vehicle Health") {
    openCustomer360FocusedArtifact(
      "notes",
      latestVehicleArtifact.id || latestVehicleArtifact.noteId || latestVehicleArtifact.timelineEventId || latestVehicleArtifact.createdAtUtc || latestVehicleArtifact.body,
      "home"
    );
    preloadFocusedVehicleServiceFollowUp({
      body: String(latestVehicleArtifact.body || "").replace(/\[vehicle\]\s*/i, "").trim()
    });
    setCustomer360ComposerStatus("VIN journey health stage opened.", "success");
    return;
  }

  if (stageKey === "movement" && latestVehicleArtifact && latestVehiclePresentation?.type === "Vehicle Movement") {
    openCustomer360FocusedArtifact(
      "notes",
      latestVehicleArtifact.id || latestVehicleArtifact.noteId || latestVehicleArtifact.timelineEventId || latestVehicleArtifact.createdAtUtc || latestVehicleArtifact.body,
      "home"
    );
    startVehicleGeoMovementNote();
    setCustomer360ComposerStatus("VIN journey movement stage opened.", "success");
    return;
  }

  if (stageKey === "service") {
    if (loanerTask) {
      openCustomer360FocusedArtifact(
        "tasks",
        loanerTask.id || loanerTask.taskId || loanerTask.createdAtUtc || loanerTask.title,
        "service"
      );
      setCustomer360ComposerStatus("VIN journey service stage opened.", "success");
      return;
    }
    if (appointments[0]) {
      openCustomer360FocusedArtifact(
        "appointments",
        appointments[0].id || appointments[0].appointmentId || `${appointments[0].date || ""}-${appointments[0].time || ""}`,
        "service"
      );
      setCustomer360ComposerStatus("VIN journey service stage opened.", "success");
      return;
    }
    setDepartmentLens("service");
    startServiceWriteUp();
    setCustomer360ComposerStatus("VIN journey service stage opened.", "success");
    return;
  }

  if (stageKey === "archive" && latestArchiveArtifact) {
    openCustomer360FocusedArtifact(
      "notes",
      latestArchiveArtifact.id || latestArchiveArtifact.noteId || latestArchiveArtifact.timelineEventId || latestArchiveArtifact.createdAtUtc || latestArchiveArtifact.body,
      "home"
    );
    preloadFocusedArchiveAction({
      body: String(latestArchiveArtifact.body || "").replace(/\[archive\]\s*/i, "").trim()
    }, "task");
    setCustomer360ComposerStatus("VIN journey archive stage opened.", "success");
  }
}

function openVinTimelineSubtype(subtype = "all") {
  currentCustomer360TimelineFilter = "vin";
  currentCustomer360VinFilter = ["health", "movement", "archive"].includes(subtype) ? subtype : "all";
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
    item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
  });
  renderCustomer360Timeline();
}

function setCustomer360TimelineFilter(kind = "all") {
  const normalizedKind = normalizeCustomer360TimelineFilter(kind);
  currentCustomer360TimelineFilter = normalizedKind;
  if (normalizedKind !== "vin") {
    currentCustomer360VinFilter = "all";
  }
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
    item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
  });
  renderCustomer360Timeline();
}

function getVehicleJourneyNextAction(state) {
  const current = state?.current?.key || "health";
  if (current === "health") {
    return {
      stageKey: "health",
      title: "Open service follow-up",
      detail: "Turn the latest vehicle health signal into an advisor-owned next step.",
      label: "Review Health"
    };
  }
  if (current === "movement") {
    return {
      stageKey: "movement",
      title: "Log movement update",
      detail: "Capture the next zone, dispatch note, or lane destination for this VIN.",
      label: "Open Movement"
    };
  }
  if (current === "service") {
    return {
      stageKey: "service",
      title: "Advance service work",
      detail: "Open the active lane, loaner, or visit workflow tied to this vehicle.",
      label: "Open Service"
    };
  }
  return {
    stageKey: "archive",
    title: "Work archive evidence",
    detail: "Turn the latest VIN evidence into a linked task or documentation follow-up.",
    label: "Open Archive"
  };
}

function buildVinArchiveItems(vehicle, customer, calls = [], notes = [], appointments = []) {
  const vinLabel = vehicle?.vin || "VIN pending";
  const serviceDate = appointments[0]?.date || "Next available";
  const vinMedia = getVinArchiveMediaAssets();
  return [
    {
      icon: "🪪",
      title: "Registration Scan",
      meta: `${vinLabel} • Updated from delivery packet`
    },
    {
      icon: "📋",
      title: "Multi-Point Inspection",
      meta: `${notes.length || 1} advisor notes • Service lane packet`
    },
    {
      icon: "🎥",
      title: "Walkaround Media",
      meta: `${vinMedia.length || calls.length || 2} media items • Customer proof set`
    },
    {
      icon: "🛠",
      title: "Service History",
      meta: `Next lane touchpoint ${serviceDate}`
    }
  ];
}

function buildLensArchiveItems(vehicle, customer, calls = [], notes = [], appointments = []) {
  const openTasks = (currentTasks || []).filter((item) => item.customerId === customer?.id && String(item.status || "").toLowerCase() !== "completed");
  const pickTask = (...keywords) => openTasks.find((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const pickNote = (...keywords) => notes.find((item) => {
    const haystack = `${item.body || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const getArtifactSourceId = (item = {}) => String(item.id || item.taskId || item.noteId || item.callId || item.appointmentId || item.createdAtUtc || item.title || item.body || "");
  if (currentDepartmentLens === "sales") {
    const salesTask = pickTask("[sales]", "quote", "deal", "opportunity");
    const fiTask = pickTask("[fi]", "finance", "delivery", "warranty");
    return [
      { icon: "💰", title: "Quote Pack", meta: `${vehicleDisplayName(vehicle)} pricing worksheet`, sourceId: getArtifactSourceId(salesTask), kind: "tasks", lens: "sales" },
      { icon: "🚗", title: "Trade Walkaround", meta: `${calls.length || 1} sales touchpoints logged`, sourceId: getArtifactSourceId(appointments[0]), kind: "appointments", lens: "sales" },
      { icon: "🧾", title: "Credit + F&I Prep", meta: `${customerDisplayName(customer)} delivery checklist`, sourceId: getArtifactSourceId(fiTask), kind: "tasks", lens: "fi" },
      { icon: "📸", title: "Merchandising Media", meta: `Vehicle media set ready for handoff` }
    ];
  }

  if (currentDepartmentLens === "bdc") {
    const bdcTask = pickTask("[bdc]", "callback", "follow-up");
    return [
      { icon: "💬", title: "Conversation History", meta: `${calls.length} calls/SMS linked to this customer`, sourceId: getArtifactSourceId(calls[0]), kind: "calls", lens: "bdc" },
      { icon: "📋", title: "Lead Notes", meta: `${notes.length || 1} notes available for the next agent`, sourceId: getArtifactSourceId(notes[0]), kind: "notes", lens: "bdc" },
      { icon: "📞", title: "Callback Packet", meta: `Preferred number ${customer?.phones?.[0] || "not set"}`, sourceId: getArtifactSourceId(bdcTask), kind: "tasks", lens: "bdc" },
      { icon: "🗂", title: "Customer Profile", meta: `${customerDisplayName(customer)} communication archive` }
    ];
  }

  if (currentDepartmentLens === "technicians") {
    const technicianTask = pickTask("[technician]", "inspection", "diagnostic", "repair");
    const partsTask = pickTask("[parts]", "parts request", "stock pull", "sourcing");
    const roMedia = getRepairOrderMediaAssets(getActiveRepairOrderRecord());
    return [
      { icon: "🧰", title: "Inspection Packet", meta: `${vehicleDisplayName(vehicle)} MPI + repair notes`, sourceId: getArtifactSourceId(technicianTask), kind: "tasks", lens: "technicians" },
      { icon: "📸", title: "Technician Media", meta: `${roMedia.length || notes.length || 1} annotated photo/video item(s) queued`, sourceId: getArtifactSourceId(roMedia[0] || notes[0]), kind: roMedia[0] ? "media" : "notes", lens: "technicians" },
      { icon: "📦", title: "Parts Pick Ticket", meta: `${appointments.length ? "Linked to active lane visit" : "Ready once RO is written"}`, sourceId: getArtifactSourceId(partsTask), kind: "tasks", lens: "parts" },
      { icon: "🗂", title: "VIN History", meta: `${customerDisplayName(customer)} prior service evidence` }
    ];
  }

  if (currentDepartmentLens === "parts") {
    const partsTask = pickTask("[parts]", "stock pull", "parts request", "sourcing", "eta");
    const partsNote = pickNote("[parts]", "eta");
    return [
      { icon: "📦", title: "Stock Pull Sheet", meta: `${vehicleDisplayName(vehicle)} pick list and shelf route`, sourceId: getArtifactSourceId(partsTask), kind: "tasks", lens: "parts" },
      { icon: "🤖", title: "Runner Dispatch", meta: `${calls.length || 1} handoff signals for technician delivery`, sourceId: getArtifactSourceId(appointments[0] || partsTask), kind: appointments[0] ? "appointments" : "tasks", lens: "parts" },
      { icon: "🧾", title: "Special Order Packet", meta: `${notes.length || 1} notes tied to ETA and vendor status`, sourceId: getArtifactSourceId(partsNote), kind: "notes", lens: "parts" },
      { icon: "🗂", title: "Core Return File", meta: `${customerDisplayName(customer)} parts-side archive` }
    ];
  }

  if (currentDepartmentLens === "accounting") {
    const accountingTask = pickTask("[accounting]", "invoice", "ledger", "statement", "payment");
    const accountingNote = pickNote("[accounting]", "ledger", "statement");
    return [
      { icon: "💳", title: "Payment Record", meta: `${customerDisplayName(customer)} payment and refund evidence`, sourceId: getArtifactSourceId(accountingNote || accountingTask), kind: accountingNote ? "notes" : "tasks", lens: "accounting" },
      { icon: "🧾", title: "Invoice Packet", meta: `${vehicleDisplayName(vehicle)} statement and line items`, sourceId: getArtifactSourceId(accountingTask), kind: "tasks", lens: "accounting" },
      { icon: "📚", title: "Ledger Trail", meta: `${notes.length || 1} internal accounting notes`, sourceId: getArtifactSourceId(accountingNote), kind: "notes", lens: "accounting" },
      { icon: "🏦", title: "Settlement File", meta: `Stripe / QuickBooks-style reconciliation packet` }
    ];
  }

  return buildVinArchiveItems(vehicle, customer, calls, notes, appointments);
}

function buildLensServiceLaneMarkup(customer, vehicle, topTask, appointments = [], calls = []) {
  const nextAppointment = appointments[0];
  const activeRepairOrder = getActiveRepairOrderRecord();
  const latestClockEvent = getRepairOrderLatestClockEvent(activeRepairOrder);
  const technicianClockedIn = latestClockEvent?.eventType === "clock_in";
  const missedCalls = calls.filter((call) => String(call.status || "").toLowerCase().includes("miss")).length;
  const missedCall = calls.find((call) => String(call.status || "").toLowerCase().includes("miss"));
  const laneTasks = (currentTasks || []).filter((item) => item.customerId === customer?.id && String(item.status || "").toLowerCase() !== "completed");
  const laneNotes = (currentCustomerNotes || []).filter((item) => item.customerId === customer?.id);
  const overdueLaneTasks = laneTasks.filter((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
  const urgentLaneTasks = laneTasks.filter((task) => {
    const tone = getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone;
    return tone === "warn" || tone === "danger";
  });
  const pickLaneTask = (...keywords) => laneTasks.find((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const getArtifactSourceId = (item = {}) => escapeHtml(String(
    item.id ||
    item.taskId ||
    item.appointmentId ||
    item.noteId ||
    item.timelineEventId ||
    item.createdAtUtc ||
    item.title ||
    item.body ||
    ""
  ));
  const bdcTask = pickLaneTask("[bdc]", "callback", "follow-up", "reconnect");
  const salesTask = pickLaneTask("[sales]", "opportunity", "quote", "deal", "test-drive", "test drive");
  const fiTask = pickLaneTask("[fi]", "finance", "funding", "delivery", "menu", "warranty");
  const technicianTask = pickLaneTask("[technician]", "inspection", "diagnostic", "diagnosis", "repair", "tech");
  const partsTask = pickLaneTask("[parts]", "parts request", "stock pull", "sourcing", "eta", "runner", "special order", "pick task");
  const accountingTask = pickLaneTask("[accounting]", "invoice", "ledger", "statement", "reconciliation", "payment");
  const ledgerNote = laneNotes.find((item) => `${item.body || ""}`.toLowerCase().includes("[accounting]") || `${item.body || ""}`.toLowerCase().includes("ledger"));
  const loanerTask = (currentTasks || []).find((item) => {
    if (item.customerId !== customer?.id) return false;
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes("loaner") || haystack.includes("transport");
  });
  const latestMovementNote = getLatestTaggedArtifact("[vehicle]", currentCustomerNotes, currentCustomerTimeline || []);
  const movementCopy = latestMovementNote && getTaggedTimelinePresentation(latestMovementNote.body || "", "Vehicle Health", "Vehicle intelligence").type === "Vehicle Movement"
    ? getTaggedTimelinePresentation(latestMovementNote.body || "", "Vehicle Health", "Vehicle intelligence").body.split("\n")[0]
    : "";
  const serviceSignals = [
    { label: "Promised", value: nextAppointment ? "Locked" : movementCopy ? "Moving" : "Open", tone: nextAppointment ? "good" : movementCopy ? "warn" : "info", action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','service')` : "startDepartmentAppointmentCreate()", detail: nextAppointment ? `Open ${nextAppointment.service || "service visit"} at ${nextAppointment.date || "TBD"} ${nextAppointment.time || ""}`.trim() : "Open service booking workflow" },
    { label: "Loaner", value: loanerTask ? "Live" : appointments.length ? "Review" : "Standby", tone: loanerTask ? "warn" : appointments.length ? "info" : "good", action: loanerTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(loanerTask)}','service')` : "startLoanerTask()", detail: loanerTask ? `Open ${loanerTask.title || "loaner coordination task"}` : "Start loaner or transport workflow" },
    { label: "Risk", value: overdueLaneTasks.length ? "High" : urgentLaneTasks.length ? "Watch" : "Low", tone: overdueLaneTasks.length ? "danger" : urgentLaneTasks.length ? "warn" : "good", action: topTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(topTask)}','service')` : "setCustomer360ComposerMode('task')", detail: topTask ? `Open ${topTask.title || "active service task"}` : "Open service follow-up queue" }
  ];
  const bdcSignals = [
    { label: "Missed", value: `${missedCalls}`, tone: missedCalls ? "danger" : "good", action: missedCall ? `openCustomer360FocusedArtifact('calls','${getArtifactSourceId(missedCall)}','bdc')` : "openSmsForPhone(getSelectedCustomerPrimaryPhone())", detail: missedCall ? `Open missed call from ${missedCall.from || "customer"}` : "Open SMS follow-up dock" },
    { label: "Queue", value: `${bdcTask ? 1 : 0}`, tone: bdcTask ? "info" : "good", action: bdcTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(bdcTask)}','bdc')` : "startBdcCallbackTask()", detail: bdcTask ? `Open ${bdcTask.title || "BDC follow-up task"}` : "Create callback queue task" },
    { label: "SLA", value: missedCalls ? "Rescue" : urgentLaneTasks.length ? "Watch" : "On", tone: missedCalls ? "danger" : urgentLaneTasks.length ? "warn" : "good", action: missedCall ? `openCustomer360FocusedArtifact('calls','${getArtifactSourceId(missedCall)}','bdc')` : bdcTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(bdcTask)}','bdc')` : "startBdcCallbackTask()", detail: missedCalls ? "Open rescue contact queue" : bdcTask ? `Open ${bdcTask.title || "callback SLA task"}` : "Open BDC callback workflow" }
  ];
  const salesSignals = [
    { label: "Visit", value: nextAppointment ? "Set" : "Open", tone: nextAppointment ? "good" : "warn", action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','sales')` : "startDepartmentAppointmentCreate()", detail: nextAppointment ? `Open ${nextAppointment.service || "showroom visit"} at ${nextAppointment.date || "TBD"} ${nextAppointment.time || ""}`.trim() : "Schedule showroom or test-drive visit" },
    { label: "Deal", value: salesTask ? "Live" : "New", tone: salesTask ? "info" : "good", action: salesTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(salesTask)}','sales')` : "startSalesDealTask()", detail: salesTask ? `Open ${salesTask.title || "sales deal task"}` : "Create next deal task" },
    { label: "Risk", value: overdueLaneTasks.length ? "High" : "Low", tone: overdueLaneTasks.length ? "danger" : urgentLaneTasks.length ? "warn" : "good", action: salesTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(salesTask)}','sales')` : "startSalesDealTask()", detail: overdueLaneTasks.length ? "Open overdue sales queue" : salesTask ? `Open ${salesTask.title || "desk task"}` : "Open sales workflow" }
  ];
  const accountingSignals = [
    { label: "Review", value: accountingTask ? "Live" : "Clear", tone: accountingTask ? "warn" : "good", action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()", detail: accountingTask ? `Open ${accountingTask.title || "invoice review task"}` : "Queue invoice review" },
    { label: "Aging", value: overdueLaneTasks.length ? `${overdueLaneTasks.length}` : "0", tone: overdueLaneTasks.length ? "danger" : "good", action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()", detail: overdueLaneTasks.length ? "Open overdue accounting queue" : "No aged accounting work open" },
    { label: "Ledger", value: ledgerNote ? "Open" : "Clear", tone: ledgerNote ? "info" : "good", action: ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : "startLedgerNote()", detail: ledgerNote ? "Open latest ledger note" : "Add ledger note" }
  ];

  if (currentDepartmentLens === "bdc") {
    return `
      <div class="customer360-service-card">
        ${buildLaneOwnerMarkup("bdc")}
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Queue Status</div>
            <div class="customer360-service-value">${missedCalls ? `${missedCalls} missed contact${missedCalls === 1 ? "" : "s"}` : "Live conversation ready"}</div>
            <div class="customer360-service-copy">BDC should keep calls, SMS, and follow-up tasks moving from this one record.</div>
          </div>
          <span class="customer360-status-pill ${missedCalls ? "warn" : "good"}">${missedCalls ? "Needs reply" : "Active"}</span>
        </div>
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Next Outreach</div>
            <div class="customer360-service-value">${escapeHtml(topTask?.title || "Send follow-up" )}</div>
            <div class="customer360-service-copy">${missedCalls ? "Missed contact is driving queue priority right now." : bdcTask ? `${urgentLaneTasks.length ? `${urgentLaneTasks.length} callback step${urgentLaneTasks.length === 1 ? "" : "s"} need attention.` : "Live callback queue is moving inside target."}` : escapeHtml(topTask?.description || "Use SMS or voice to move the customer into a confirmed next step.")}</div>
          </div>
          <span class="customer360-status-pill info">BDC</span>
        </div>
        ${buildServiceSignalMarkup(bdcSignals)}
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${bdcTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(bdcTask)}','bdc')` : "startBdcCallbackTask()"}">${bdcTask ? "Open Follow-Up" : "Queue Follow-Up"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="openSmsForPhone(getSelectedCustomerPrimaryPhone())">Open SMS Dock</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "sales") {
    return `
      <div class="customer360-service-card">
        ${buildLaneOwnerMarkup("sales")}
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Opportunity</div>
            <div class="customer360-service-value">${vehicle ? vehicleDisplayName(vehicle) : "Customer opportunity"}</div>
            <div class="customer360-service-copy">Sales should keep quote, trade, and test-drive actions tied to the same customer and vehicle record.</div>
          </div>
          <span class="customer360-status-pill good">Open</span>
        </div>
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Next Step</div>
            <div class="customer360-service-value">${nextAppointment ? "Confirmed visit" : "Schedule test drive"}</div>
            <div class="customer360-service-copy">${salesTask ? `${overdueLaneTasks.length ? `${overdueLaneTasks.length} sales item${overdueLaneTasks.length === 1 ? "" : "s"} overdue.` : nextAppointment ? `${escapeHtml(nextAppointment.date || "")} ${escapeHtml(nextAppointment.time || "")}` : "Deal queue is active and ready for the next desk action."}` : nextAppointment ? `${escapeHtml(nextAppointment.date || "")} ${escapeHtml(nextAppointment.time || "")}` : "Move this lead toward an in-store appointment or quote review."}</div>
          </div>
          <span class="customer360-status-pill info">Sales</span>
        </div>
        ${buildServiceSignalMarkup(salesSignals)}
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${salesTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(salesTask)}','sales')` : "startSalesDealTask()"}">${salesTask ? "Open Deal Task" : "Create Deal Task"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','sales')` : "startDepartmentAppointmentCreate()"}">${nextAppointment ? "Open Visit" : "Schedule Visit"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "fi") {
    return `
      <div class="customer360-service-card">
        ${buildLaneOwnerMarkup("fi")}
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Funding Status</div>
            <div class="customer360-service-value">${topTask ? "Package in review" : "Awaiting handoff"}</div>
            <div class="customer360-service-copy">F&I should keep menu products, funding steps, and delivery-readiness on the same customer and vehicle record.</div>
          </div>
          <span class="customer360-status-pill ${topTask ? "warn" : "info"}">${topTask ? "Active" : "Pending"}</span>
        </div>
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Delivery Readiness</div>
            <div class="customer360-service-value">${topTask ? "Pre-close checklist" : "Not started"}</div>
            <div class="customer360-service-copy">${fiTask ? `${overdueLaneTasks.length ? `${overdueLaneTasks.length} funding item${overdueLaneTasks.length === 1 ? "" : "s"} overdue.` : escapeHtml(fiTask.title || "Finance package review")}` : topTask ? escapeHtml(topTask.title || "Finance package review") : "Use this lane for warranty, funding, and delivery-prep actions."}</div>
          </div>
          <span class="customer360-status-pill info">F&I</span>
        </div>
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${fiTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(fiTask)}','fi')` : "startFiReviewNote()"}">${fiTask ? "Open F&I Work" : "Open F&I Note"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','fi')` : "startDeliveryHandoffAppointment()"}">${nextAppointment ? "Open Delivery" : "Prep Delivery"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "technicians") {
    return `
      <div class="customer360-service-card">
        ${buildLaneOwnerMarkup("technicians")}
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Bay Assignment</div>
            <div class="customer360-service-value">${vehicle ? "Bay 4 • active" : "Awaiting dispatch"}</div>
            <div class="customer360-service-copy">Technician work, media capture, and inspection updates should anchor back to this VIN record.</div>
          </div>
          <span class="customer360-status-pill good">In Shop</span>
        </div>
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Parts Readiness</div>
            <div class="customer360-service-value">${topTask ? "Request queued" : "No part hold"}</div>
            <div class="customer360-service-copy">${topTask ? escapeHtml(topTask.title || "Technician request") : "Parts request and robot runner status can surface here."}</div>
          </div>
          <span class="customer360-status-pill info">Tech</span>
        </div>
        <div class="customer360-service-actions">
          ${technicianTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(technicianTask)}','technicians')">Open Work Step</button>` : topTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="completeTask('${escapeHtml(topTask.id)}')">Close Work Step</button>` : ""}
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${laneNotes[0] ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(laneNotes[0])}','technicians')` : "startTechnicianInspectionNote()"}">${laneNotes[0] ? "Open Inspection Note" : "Add Inspection Note"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "parts") {
    return `
      <div class="customer360-service-card">
        ${buildLaneOwnerMarkup("parts")}
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Counter Status</div>
            <div class="customer360-service-value">${topTask ? "Pick in progress" : "Awaiting request"}</div>
            <div class="customer360-service-copy">Special orders, shelf pulls, and robot-runner dispatches should stay tied to the same vehicle record.</div>
          </div>
          <span class="customer360-status-pill ${topTask ? "warn" : "info"}">${topTask ? "Active" : "Idle"}</span>
        </div>
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Delivery Route</div>
            <div class="customer360-service-value">${appointments.length ? "Send to active bay" : "Stage for advisor"}</div>
            <div class="customer360-service-copy">${appointments.length ? "A runner can deliver parts directly to the technician once the request is approved." : "No active lane event yet, so keep the order staged at counter."}</div>
          </div>
          <span class="customer360-status-pill info">Parts</span>
        </div>
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createPartsPickTask()"}">${partsTask ? "Open Pick Task" : "Create Pick Task"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${laneNotes[0] ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(laneNotes[0])}','parts')` : "startPartsEtaNote()"}">${laneNotes[0] ? "Open Parts Note" : "Log Parts Note"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "accounting") {
    return `
      <div class="customer360-service-card">
        ${buildLaneOwnerMarkup("accounting")}
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Ledger Status</div>
            <div class="customer360-service-value">${topTask ? "Needs posting" : "Balanced"}</div>
            <div class="customer360-service-copy">Invoices, refunds, and Stripe-backed payments should reconcile from this same customer and VIN context.</div>
          </div>
          <span class="customer360-status-pill ${topTask ? "warn" : "good"}">${topTask ? "Review" : "Clear"}</span>
        </div>
        <div class="customer360-service-row">
          <div>
            <div class="customer360-service-label">Payment Rail</div>
            <div class="customer360-service-value">Stripe + Statement</div>
            <div class="customer360-service-copy">${accountingTask ? `${overdueLaneTasks.length ? `${overdueLaneTasks.length} invoice review${overdueLaneTasks.length === 1 ? "" : "s"} overdue.` : urgentLaneTasks.length ? `${urgentLaneTasks.length} accounting step${urgentLaneTasks.length === 1 ? "" : "s"} need attention.` : "Open accounting work suggests a statement, invoice, or collection follow-up is active."}` : "Use this rail for invoice, payment, refund, and statement workflows."}</div>
          </div>
          <span class="customer360-status-pill info">Accounting</span>
        </div>
        ${buildServiceSignalMarkup(accountingSignals)}
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : "startLedgerNote()"}">${ledgerNote ? "Open Ledger Note" : "Add Ledger Note"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()"}">${accountingTask ? "Open Invoice Task" : "Queue Invoice Task"}</button>
        </div>
      </div>
    `;
  }

  const loanerState = loanerTask
    ? "In Progress"
    : (String(getDepartmentLensConfig().name).toLowerCase().includes("service") || !!nextAppointment
      ? "Suggested"
      : "Standby");
  const laneStatus = nextAppointment
    ? "Appointment Ready"
    : movementCopy
      ? "Vehicle Moving"
      : "Pre-Arrival";
  return `
    <div class="customer360-service-card">
      <div class="customer360-service-row">
        <div>
          <div class="customer360-service-label">Live Repair Order</div>
          <div class="customer360-service-value">${activeRepairOrder ? `${escapeHtml(activeRepairOrder.repairOrderNumber || "RO-lite")} • ${escapeHtml(titleCase(String(activeRepairOrder.status || "open")))}` : laneStatus}</div>
          <div class="customer360-service-copy">${activeRepairOrder ? `${escapeHtml(activeRepairOrder.complaint || "Complaint pending")} • ${escapeHtml(formatMoney(activeRepairOrder.totalAmount || ((activeRepairOrder.laborTotal || 0) + (activeRepairOrder.partsTotal || 0) + (activeRepairOrder.feesTotal || 0))))} total • ${escapeHtml(formatMoney(activeRepairOrder.balanceDue || activeRepairOrder.totalAmount || 0))} balance` : nextAppointment ? `${escapeHtml(nextAppointment.service || "Service visit")} with ${escapeHtml(nextAppointment.advisor || "First Available")}` : movementCopy ? `${escapeHtml(movementCopy)}.` : "No service booking yet. Use the 360 composer to book the next lane event."}</div>
        </div>
        <span class="customer360-status-pill ${activeRepairOrder ? getRepairOrderStatusTone(activeRepairOrder.status) : nextAppointment ? "good" : movementCopy ? "warn" : "info"}">${activeRepairOrder ? escapeHtml(titleCase(String(activeRepairOrder.status || "open"))) : nextAppointment ? "Booked" : movementCopy ? "Moving" : "Open"}</span>
      </div>
      <div class="customer360-service-row">
        <div>
          <div class="customer360-service-label">${activeRepairOrder ? "Technician Time" : "Loaner Desk"}</div>
          <div class="customer360-service-value">${activeRepairOrder ? (latestClockEvent ? titleCase(String(latestClockEvent.eventType || "").replaceAll("_", " ")) : "No time posted") : loanerState}</div>
          <div class="customer360-service-copy">${activeRepairOrder ? (latestClockEvent ? `${escapeHtml(formatDisplayDateTime(latestClockEvent.occurredAtUtc || latestClockEvent.createdAtUtc || latestClockEvent.updatedAtUtc))} • ${technicianClockedIn ? "Technician is currently on the RO." : "Latest clock event is posted to the job."}` : "Technician clocking has not started on this RO yet.") : loanerTask ? escapeHtml((loanerTask.description || loanerTask.title || "Loaner coordination is active.").slice(0, 120)) : appointments.length ? "Advisor should confirm transportation needs before write-up." : "Reserve later if diagnostics expand into all-day work."}</div>
        </div>
        <span class="customer360-status-pill ${activeRepairOrder ? (technicianClockedIn ? "warn" : "info") : loanerState === "In Progress" ? "warn" : loanerState === "Suggested" ? "warn" : "info"}">${activeRepairOrder ? (technicianClockedIn ? "Clocked In" : "Ready") : loanerState}</span>
      </div>
      <div class="customer360-service-row">
        <div>
          <div class="customer360-service-label">${activeRepairOrder ? "Advisor Controls" : "Open Follow-Up"}</div>
          <div class="customer360-service-value">${activeRepairOrder ? "Estimate • Parts • Accounting" : escapeHtml(topTask?.title || "No active task")}</div>
          <div class="customer360-service-copy">${activeRepairOrder ? "Use this lane to keep the write-up open, add estimate lines, request parts, and post accounting without leaving the advisor view." : overdueLaneTasks.length ? `${overdueLaneTasks.length} service item${overdueLaneTasks.length === 1 ? "" : "s"} overdue and needs intervention.` : escapeHtml(topTask?.description || "A technician or advisor task will surface here once work begins.")}</div>
        </div>
        ${activeRepairOrder ? `<span class="customer360-status-pill info">${escapeHtml(formatMoney(activeRepairOrder.balanceDue || activeRepairOrder.totalAmount || 0))}</span>` : topTask ? `<span class="customer360-status-pill info">${escapeHtml(topTask.priority || "normal")}</span>` : `<span class="customer360-status-pill good">Clear</span>`}
      </div>
      ${buildServiceSignalMarkup(serviceSignals)}
      <div class="customer360-service-actions">
        ${activeRepairOrder ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="addRepairOrderEstimateLine()">Add Estimate</button>` : ""}
        ${activeRepairOrder ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="addRepairOrderPartRequest()">Add Part Line</button>` : ""}
        ${activeRepairOrder ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="${technicianClockedIn ? `addTechnicianClockEvent('clock_out')` : `addTechnicianClockEvent('clock_in')`}">${technicianClockedIn ? "Clock Technician Out" : "Clock Technician In"}</button>` : ""}
        ${activeRepairOrder ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="addAccountingRepairOrderEntry()">Post Payment / Entry</button>` : ""}
        ${topTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="completeTask('${escapeHtml(topTask.id)}')">Mark Task Complete</button>` : ""}
        ${loanerTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="openCustomer360FocusedArtifact('tasks','${escapeHtml(String(loanerTask.id || loanerTask.taskId || loanerTask.createdAtUtc || loanerTask.title))}','service')">Open Loaner Task</button>` : ""}
        <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "closeActiveRepairOrder()" : nextAppointment ? "openRepairOrderFrom360()" : "startDepartmentAppointmentCreate()"}">${activeRepairOrder ? "Close RO" : nextAppointment ? "Open RO from Appointment" : "Open Service Composer"}</button>
      </div>
      ${activeRepairOrder ? buildRepairOrderDetailSectionsMarkup(activeRepairOrder) : ""}
    </div>
  `;
}

function buildLensPanelMarkup(customer, vehicle, tasks = [], notes = [], appointments = [], calls = []) {
  const topTask = tasks[0];
  const nextAppointment = appointments[0];
  const missedCalls = calls.filter((call) => String(call.status || "").toLowerCase().includes("miss")).length;
  const missedCall = calls.find((call) => String(call.status || "").toLowerCase().includes("miss"));
  const latestNote = notes[0];
  const contactPhone = customer?.phones?.[0] || "Not set";
  const vehicleName = vehicleDisplayName(vehicle);
  const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const overdueTasks = openTasks.filter((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
  const urgentTasks = openTasks.filter((task) => {
    const tone = getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone;
    return tone === "warn" || tone === "danger";
  });
  const pickOpenTask = (...keywords) => openTasks.find((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const getArtifactSourceId = (item = {}) => escapeHtml(String(
    item.id ||
    item.taskId ||
    item.appointmentId ||
    item.noteId ||
    item.timelineEventId ||
    item.createdAtUtc ||
    item.title ||
    item.body ||
    ""
  ));
  const loanerTask = tasks.find((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes("loaner") || haystack.includes("transport");
  });
  const bdcTask = pickOpenTask("[bdc]", "callback", "follow-up", "reconnect");
  const bdcTasks = openTasks.filter((item) => `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[bdc]") || `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("callback"));
  const salesTask = pickOpenTask("[sales]", "opportunity", "quote", "deal", "test-drive", "test drive");
  const salesTasks = openTasks.filter((item) => `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[sales]") || `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("quote") || `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("deal"));
  const fiTask = pickOpenTask("[fi]", "finance", "funding", "delivery", "menu", "warranty");
  const accountingTask = pickOpenTask("[accounting]", "invoice", "ledger", "statement", "reconciliation", "payment");
  const accountingTasks = openTasks.filter((item) => `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[accounting]") || `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("invoice") || `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("ledger"));
  const technicianTask = pickOpenTask("[technician]", "inspection", "diagnostic", "diagnosis", "repair", "tech");
  const partsTask = pickOpenTask("[parts]", "parts request", "stock pull", "sourcing", "eta", "runner", "special order", "pick task");
  const partsEtaNote = [...notes].find((item) => `${item.body || ""}`.toLowerCase().includes("[parts]") || `${item.body || ""}`.toLowerCase().includes("parts eta"));
  const ledgerNote = [...notes].find((item) => `${item.body || ""}`.toLowerCase().includes("[accounting]") || `${item.body || ""}`.toLowerCase().includes("ledger"));
  const latestMovementNote = getLatestTaggedArtifact("[vehicle]", notes, currentCustomerTimeline || []);
  const movementPresentation = latestMovementNote
    ? getTaggedTimelinePresentation(latestMovementNote.body || "", "Vehicle Health", "Vehicle intelligence")
    : null;
  const activeMovementCopy = movementPresentation?.type === "Vehicle Movement"
    ? movementPresentation.body.split("\n")[0]
    : "";
  const serviceSignals = [
    {
      label: "Promised",
      value: nextAppointment ? "Locked" : activeMovementCopy ? "Moving" : "Open",
      tone: nextAppointment ? "good" : activeMovementCopy ? "warn" : "info",
      action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','service')` : "startServiceWriteUp()"
    },
    {
      label: "Transport",
      value: loanerTask ? "Live" : appointments.length ? "Review" : "Standby",
      tone: loanerTask ? "warn" : appointments.length ? "info" : "good",
      action: loanerTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(loanerTask)}','service')` : "startLoanerTask()"
    },
    {
      label: "Overdue",
      value: overdueTasks.length ? `${overdueTasks.length}` : urgentTasks.length ? `${urgentTasks.length}` : "0",
      tone: overdueTasks.length ? "danger" : urgentTasks.length ? "warn" : "good",
      action: topTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(topTask)}','service')` : "setCustomer360ComposerMode('task')"
    }
  ];
  const bdcSignals = [
    {
      label: "Missed",
      value: `${missedCalls}`,
      tone: missedCalls ? "danger" : "good",
      action: missedCall ? `openCustomer360FocusedArtifact('calls','${getArtifactSourceId(missedCall)}','bdc')` : "openSmsForPhone(getSelectedCustomerPrimaryPhone())"
    },
    {
      label: "Callbacks",
      value: `${bdcTasks.length}`,
      tone: bdcTasks.length ? "info" : "good",
      action: bdcTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(bdcTask)}','bdc')` : "startBdcCallbackTask()"
    },
    {
      label: "SLA",
      value: missedCalls ? "Rescue" : urgentTasks.length ? "Watch" : "On Track",
      tone: missedCalls ? "danger" : urgentTasks.length ? "warn" : "good",
      action: missedCall ? `openCustomer360FocusedArtifact('calls','${getArtifactSourceId(missedCall)}','bdc')` : bdcTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(bdcTask)}','bdc')` : "startBdcCallbackTask()"
    }
  ];
  const salesSignals = [
    {
      label: "Deals",
      value: `${salesTasks.length || (notes.length ? 1 : 0)}`,
      tone: salesTasks.length ? "info" : notes.length ? "warn" : "good",
      action: salesTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(salesTask)}','sales')` : "startSalesDealTask()"
    },
    {
      label: "Visit",
      value: nextAppointment ? "Set" : "Open",
      tone: nextAppointment ? "good" : "warn",
      action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','sales')` : "startDepartmentAppointmentCreate()"
    },
    {
      label: "Desk Risk",
      value: overdueTasks.length ? "High" : urgentTasks.length ? "Watch" : "Low",
      tone: overdueTasks.length ? "danger" : urgentTasks.length ? "warn" : "good",
      action: salesTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(salesTask)}','sales')` : "startSalesDealTask()"
    }
  ];
  const accountingSignals = [
    {
      label: "Reviews",
      value: `${accountingTasks.length || (topTask ? 1 : 0)}`,
      tone: accountingTasks.length ? "info" : topTask ? "warn" : "good",
      action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()"
    },
    {
      label: "Aging",
      value: overdueTasks.length ? `${overdueTasks.length}` : "0",
      tone: overdueTasks.length ? "danger" : "good",
      action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()"
    },
    {
      label: "Collections",
      value: ledgerNote || accountingTask ? "Live" : "Clear",
      tone: overdueTasks.length ? "danger" : ledgerNote || accountingTask ? "warn" : "good",
      action: ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "startLedgerNote()"
    }
  ];
  const activeRepairOrder = getActiveRepairOrderRecord();
  const latestClockEvent = getRepairOrderLatestClockEvent(activeRepairOrder);
  const technicianClockedIn = latestClockEvent?.eventType === "clock_in";

  if (currentDepartmentLens === "service") {
    const roAmounts = getRepairOrderAmounts(activeRepairOrder || {});
    const roPartOrders = activeRepairOrder ? getRepairOrderPartOrders(activeRepairOrder) : [];
    const roArInvoices = activeRepairOrder ? getRepairOrderArInvoices(activeRepairOrder) : [];
    const roApBills = activeRepairOrder ? getRepairOrderApBills(activeRepairOrder) : [];
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Repair Order</div>
          <div class="customer360-lens-value">${activeRepairOrder ? `${escapeHtml(activeRepairOrder.repairOrderNumber || "RO-lite")} • ${escapeHtml(titleCase(String(activeRepairOrder.status || "open")))}` : vehicle?.vin ? `RO-lite • ${escapeHtml(vehicle.vin.slice(-6))}` : "RO-lite pending"}</div>
          <div class="customer360-lens-copy">Primary concern: ${escapeHtml(activeRepairOrder?.complaint || topTask?.description || nextAppointment?.service || "Customer concern not written yet.")}</div>
          <div class="customer360-lens-copy" style="margin-top:8px;">${activeRepairOrder ? `Estimate ${escapeHtml(formatMoney(activeRepairOrder.totalAmount || ((activeRepairOrder.laborTotal || 0) + (activeRepairOrder.partsTotal || 0) + (activeRepairOrder.feesTotal || 0))))} • Balance ${escapeHtml(formatMoney(activeRepairOrder.balanceDue || activeRepairOrder.totalAmount || 0))} • Tech ${escapeHtml(latestClockEvent ? titleCase(String(latestClockEvent.eventType || "").replaceAll("_", " ")) : "not clocked")}` : "Open the RO here before estimates, technician time, parts, and accounting are posted."}</div>
        </div>
        ${activeRepairOrder ? buildRepairOrderSnapshotMarkup(customer, vehicle, activeRepairOrder) : ""}
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Lane Check-In</small>
            <strong>${nextAppointment ? "Customer expected" : activeMovementCopy ? "Vehicle moving" : "Needs arrival slot"}</strong>
            <span>${nextAppointment ? `${escapeHtml(nextAppointment.service || "Service visit")} queued for advisor write-up.` : activeMovementCopy ? `${escapeHtml(activeMovementCopy)}.` : "Use Schedule Service to set the arrival window and advisor ownership."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Loaner Board</small>
            <strong>${loanerTask ? "In progress" : appointments.length ? "Review eligibility" : "Standby"}</strong>
            <span>${loanerTask ? escapeHtml((loanerTask.description || loanerTask.title || "Loaner coordination is active.").slice(0, 120)) : appointments.length ? "Transportation should be confirmed before diagnostics turn into all-day work." : "No transportation request has been captured yet."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>RO Totals</small>
            <strong>${activeRepairOrder ? `${formatMoney(roAmounts.total)} total • ${formatMoney(roAmounts.balance)} due` : "Open RO first"}</strong>
            <span>${activeRepairOrder ? `${(activeRepairOrder.laborOps || []).length} labor ops • ${(activeRepairOrder.multiPointInspections || []).length} MPI • ${roPartOrders.length} special order${roPartOrders.length === 1 ? "" : "s"}` : "Advisor totals, approvals, and pay posture show up here once the RO is live."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Back Office</small>
            <strong>${activeRepairOrder ? `${roArInvoices.length} AR • ${roApBills.length} AP` : "No AR/AP yet"}</strong>
            <span>${activeRepairOrder ? `${(activeRepairOrder.accountingEntries || []).length} accounting entr${(activeRepairOrder.accountingEntries || []).length === 1 ? "y" : "ies"} tied to this RO.` : "As soon as the RO is open, receivable and vendor payable posture should be accessible here."}</span>
          </div>
        </div>
        ${buildLaneSignalMarkup(serviceSignals)}
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "addRepairOrderEstimateLine()" : nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','service')` : "startServiceWriteUp()"}"><span>🛠</span>${activeRepairOrder ? "Add Estimate" : nextAppointment ? "Open Visit" : "Schedule Service"}</button>
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "addRepairOrderLaborOp()" : loanerTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(loanerTask)}','service')` : "startLoanerTask()"}"><span>🔧</span>${activeRepairOrder ? "Dispatch Labor" : loanerTask ? "Open Loaner" : "Create Loaner"}</button>
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "createAccountsReceivableInvoice()" : latestMovementNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(latestMovementNote)}','service')` : "startVehicleGeoMovementNote()"}"><span>💳</span>${activeRepairOrder ? "Post AR" : latestMovementNote ? "Open Movement" : "Log Movement"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Promised Time</div>
          <div class="customer360-lens-value">${nextAppointment ? `${escapeHtml(nextAppointment.date || "")} ${escapeHtml(nextAppointment.time || "")}` : loanerTask ? "Transport review active" : "Awaiting booking"}</div>
          <div class="customer360-lens-copy">${nextAppointment ? `${overdueTasks.length ? `${overdueTasks.length} service item${overdueTasks.length === 1 ? "" : "s"} overdue.` : urgentTasks.length ? `${urgentTasks.length} service step${urgentTasks.length === 1 ? "" : "s"} needs attention.` : "Use this area to evolve into lane check-in, write-up, and promised-time control."}` : loanerTask ? "Transportation workflow is active before promised-time control is locked." : "Use this area to evolve into lane check-in, write-up, and promised-time control."}</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Verify concern</b><span>${escapeHtml(topTask?.title || "Capture warning light / complaint in advisor notes.")}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Confirm transportation</b><span>${loanerTask ? "Loaner or shuttle workflow is already open and needs advisor follow-through." : appointments.length ? "Offer shuttle or loaner before write-up closes." : "Transportation need has not been answered yet."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Set promised time</b><span>${nextAppointment ? "Promised-time placeholder is present and ready for advisor control." : activeMovementCopy ? "Vehicle movement should settle before promised-time control is finalized." : "No promised time until service visit is booked."}</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          ${loanerTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="openCustomer360FocusedArtifact('tasks','${escapeHtml(String(loanerTask.id || loanerTask.taskId || loanerTask.createdAtUtc || loanerTask.title))}','service')">Open Loaner Workflow</button>` : ""}
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "closeActiveRepairOrder()" : "openRepairOrderFrom360()"}">${activeRepairOrder ? "Close Repair Order" : "Open Repair Order"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "addRepairOrderEstimateLine()" : "openRepairOrderFrom360()"}">${activeRepairOrder ? "Add Estimate Line" : "Open RO First"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "addRepairOrderPartRequest()" : "openRepairOrderFrom360()"}">${activeRepairOrder ? "Add Part Line" : "Open RO First"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "createSpecialPartOrder()" : "openRepairOrderFrom360()"}">${activeRepairOrder ? "Place Special Order" : "Open RO First"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? (technicianClockedIn ? `addTechnicianClockEvent('clock_out')` : `addTechnicianClockEvent('clock_in')`) : "openRepairOrderFrom360()"}">${activeRepairOrder ? (technicianClockedIn ? "Clock Technician Out" : "Clock Technician In") : "Open RO First"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "createAccountsPayableBill()" : "startAdvisorJourneyNote()"}">${activeRepairOrder ? "Add AP Bill" : "Add Advisor Note"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "createAccountsReceivableInvoice()" : "startAdvisorJourneyNote()"}">${activeRepairOrder ? "Post AR Invoice" : "Add Advisor Note"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "bdc") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Queue State</div>
          <div class="customer360-lens-value">${missedCalls ? `${missedCalls} missed contact${missedCalls === 1 ? "" : "s"}` : "Hot lead / active thread"}</div>
          <div class="customer360-lens-copy">Missed calls, SMS threads, and callbacks stay attached to this same customer record.</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Callback SLA</small>
            <strong>${missedCalls ? "Due in 15 min" : bdcTasks.length ? `${bdcTasks.length} live callbacks` : "Within target"}</strong>
            <span>${missedCalls ? "Missed contacts should move to the top of the callback queue." : bdcTasks.length ? `${urgentTasks.length ? `${urgentTasks.length} callback step${urgentTasks.length === 1 ? "" : "s"} need attention.` : "Callback queue is active but still inside target."}` : "Current thread is warm and does not need rescue cadence yet."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Campaign Source</small>
            <strong>${latestNote ? "Warranty inquiry" : "Inbound lead"}</strong>
            <span>${latestNote ? "Recent notes suggest campaign-style follow-up and appointment conversion." : "Use this area later for source attribution and campaign routing."}</span>
          </div>
        </div>
        ${buildLaneSignalMarkup(bdcSignals)}
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${bdcTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(bdcTask)}','bdc')` : "startBdcCallbackTask()"}"><span>☎</span>${bdcTask ? "Open Callback" : "Queue Callback"}</button>
          <button class="customer360-lens-quickbtn" onclick="openSmsForPhone(getSelectedCustomerPrimaryPhone())"><span>💬</span>Send Follow-Up</button>
          <button class="customer360-lens-quickbtn" onclick="${nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','bdc')` : "startDepartmentAppointmentCreate()"}"><span>📅</span>${nextAppointment ? "Open Visit" : "Schedule Visit"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Next Play</div>
          <div class="customer360-lens-value">${escapeHtml(topTask?.title || "Send follow-up + confirm visit")}</div>
          <div class="customer360-lens-copy">${escapeHtml(topTask?.description || "BDC should drive toward appointment confirmation or handoff.")}</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Reconnect fast</b><span>${missedCalls ? "Use the SMS dock or outbound call to recover the missed touchpoint." : "Conversation is active; keep the thread warm with a clear next step."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Confirm appointment intent</b><span>${nextAppointment ? "Customer already has a visit on the books." : "Push toward a service or showroom appointment from this thread."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Handoff cleanly</b><span>${nextAppointment ? "Advisor handoff packet is ready once arrival is confirmed." : "Route to Service or Sales only after the next commitment is captured."}</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="openSmsForPhone(getSelectedCustomerPrimaryPhone())">Open SMS Follow-Up</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('task')">Queue Callback Task</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "sales") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Opportunity Stage</div>
          <div class="customer360-lens-value">${nextAppointment ? "Showroom visit booked" : "Working lead"}</div>
          <div class="customer360-lens-copy">${vehicle ? `${escapeHtml(vehicleName)} remains the active opportunity anchor.` : "Opportunity will attach to the selected vehicle or deal record."}</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Trade Appraisal</small>
            <strong>${vehicle ? "Open for review" : "Pending vehicle selection"}</strong>
            <span>${vehicle ? "Use the same 360 record to capture trade walkaround, appraisal notes, and quote deltas." : "Once a vehicle is attached, trade posture can live here."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Quote Status</small>
            <strong>${salesTasks.length ? `${salesTasks.length} deal step${salesTasks.length === 1 ? "" : "s"} live` : notes.length ? "Worksheet in progress" : "Not issued"}</strong>
            <span>${salesTasks.length ? `${overdueTasks.length ? `${overdueTasks.length} sales item${overdueTasks.length === 1 ? "" : "s"} overdue.` : nextAppointment ? "Showroom commitment exists and can move into quote review." : "Sales queue is active and ready for the next desk action."}` : notes.length ? "Recent notes imply the customer is already in pricing discussion." : "This area can evolve into live quote, payment, and F&I menu surfaces."}</span>
          </div>
        </div>
        ${buildLaneSignalMarkup(salesSignals)}
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${salesTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(salesTask)}','sales')` : "startSalesDealTask()"}"><span>🏷</span>${salesTask ? "Open Deal" : "Create Deal"}</button>
          <button class="customer360-lens-quickbtn" onclick="${nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','sales')` : "startDepartmentAppointmentCreate()"}"><span>🚘</span>${nextAppointment ? "Open Visit" : "Schedule Drive"}</button>
          <button class="customer360-lens-quickbtn" onclick="${fiTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(fiTask)}','fi')` : "startFiReviewNote()"}"><span>🧾</span>${fiTask ? "Open F&amp;I" : "Hand Off F&amp;I"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Trade / Quote</div>
          <div class="customer360-lens-value">${notes.length ? "Quote package in progress" : "Trade + quote not started"}</div>
          <div class="customer360-lens-copy">This area can grow into quote, trade, menu pricing, and delivery checklist views.</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Set visit</b><span>${nextAppointment ? "Showroom or test-drive visit already has a time anchor." : "Book a test drive or desk appointment from the 360 composer."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Advance the deal</b><span>${escapeHtml(topTask?.title || "Create a quote or desk task for next contact.")}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Delivery readiness</b><span>${latestNote ? "Notes already exist to seed delivery checklist and F&I handoff." : "No delivery packet has been started yet."}</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('task')">Open Deal Task</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startDepartmentAppointmentCreate()">Schedule Test Drive</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "fi") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Funding Desk</div>
          <div class="customer360-lens-value">${topTask ? "Package in motion" : "Waiting on handoff"}</div>
          <div class="customer360-lens-copy">${vehicle ? `${escapeHtml(vehicleName)} stays attached through menu, warranty, and delivery readiness.` : "F&I actions will attach to the selected deal and vehicle context."}</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Menu / Warranty</small>
            <strong>${notes.length ? "Discussion active" : "Not started"}</strong>
            <span>${notes.length ? "Recent notes can seed warranty, protection, and funding context." : "Open a finance note to capture products, lender posture, and customer selections."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Delivery Readiness</small>
            <strong>${nextAppointment ? "Timed handoff" : "Prep required"}</strong>
            <span>${nextAppointment ? "There is already a visit anchor that can become the delivery checkpoint." : "Use this lane to prep signatures, funding, and final handoff control."}</span>
          </div>
        </div>
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${fiTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(fiTask)}','fi')` : "startFiReviewNote()"}"><span>🧾</span>${fiTask ? "Open F&amp;I" : "Open F&I Note"}</button>
          <button class="customer360-lens-quickbtn" onclick="${nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','fi')` : "startDeliveryHandoffAppointment()"}"><span>🎉</span>${nextAppointment ? "Open Delivery" : "Prep Delivery"}</button>
          <button class="customer360-lens-quickbtn" onclick="${accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()"}"><span>💳</span>${accountingTask ? "Open Review" : "Queue Review"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Funding / Delivery</div>
          <div class="customer360-lens-value">${escapeHtml(topTask?.title || "Build finance packet")}</div>
          <div class="customer360-lens-copy">${escapeHtml(topTask?.description || "Use this area for lender touchpoints, menu products, statement prep, and delivery readiness.")}</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Open menu review</b><span>${notes.length ? "Recent activity already gives this lane customer context." : "No finance note has been captured yet for this deal."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Confirm funding path</b><span>${topTask ? "An active task is already pulling the deal toward close." : "Queue the next finance review or accounting checkpoint from here."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Stage delivery</b><span>${nextAppointment ? "A timed visit is available to evolve into delivery handoff." : "Create a delivery handoff once funding is steady."}</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startFiReviewNote()">Open F&amp;I Note</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startDeliveryHandoffAppointment()">Prep Delivery</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "technicians") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Work Order</div>
          <div class="customer360-lens-value">${vehicle?.vin ? `Bay job • ${escapeHtml(vehicle.vin.slice(-6))}` : "Work order pending"}</div>
          <div class="customer360-lens-copy">Inspection findings, media, and technician notes should collect around this VIN-linked job record.</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Inspection Flow</small>
            <strong>${notes.length ? "Findings captured" : "Awaiting first note"}</strong>
            <span>${notes.length ? "Media and notes are ready to support advisor approvals." : "Use internal notes to start the digital inspection trail."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Robot Parts Runner</small>
            <strong>${topTask ? "Request likely" : "Standby"}</strong>
            <span>${topTask ? "Open tech tasks can become parts-runner dispatch requests." : "No active parts handoff has been created yet."}</span>
          </div>
        </div>
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? (technicianClockedIn ? `addTechnicianClockEvent('clock_out')` : `addTechnicianClockEvent('clock_in')`) : "openRepairOrderFrom360()"}"><span>🔧</span>${activeRepairOrder ? (technicianClockedIn ? "Clock Out" : "Clock In") : technicianTask ? "Open Job" : "Open RO"}</button>
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "addRepairOrderInspection()" : (partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createTechnicianPartsRequest()")}"><span>🩺</span>${activeRepairOrder ? "Add MPI" : partsTask ? "Open Parts" : "Request Parts"}</button>
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "captureTechnicianMedia('repair_order','photo')" : (latestNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(latestNote)}','technicians')` : "startTechnicianInspectionNote()")}"><span>📸</span>${activeRepairOrder ? "Capture Media" : latestNote ? "Open Finding" : "Log Finding"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Next Procedure</div>
          <div class="customer360-lens-value">${escapeHtml(topTask?.title || "Start digital inspection")}</div>
          <div class="customer360-lens-copy">${escapeHtml(topTask?.description || "Technician should progress diagnosis, media capture, and parts needs from here.")}</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Open inspection</b><span>Capture the first technician finding and attach media to the VIN archive.</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Request parts</b><span>${topTask ? "Convert the active task into a technician-to-parts handoff." : "No parts request has been created yet."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Return findings</b><span>Advisor approvals and status updates should flow back through the same timeline.</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "addRepairOrderLaborOp()" : "startTechnicianInspectionNote()"}">${activeRepairOrder ? "Add Labor Op" : "Log Technician Finding"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "captureTechnicianMedia('vin_archive','video')" : "openRepairOrderFrom360()"}">${activeRepairOrder ? "Record VIN Video" : "Open RO First"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "parts") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Parts Request</div>
          <div class="customer360-lens-value">${vehicle ? `Stock pull • ${escapeHtml(vehicleName)}` : "Request pending"}</div>
          <div class="customer360-lens-copy">Every pick, special order, and runner dispatch should stay tied to this VIN and repair context.</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Availability</small>
            <strong>${topTask ? "Needs verification" : "No active SKU"}</strong>
            <span>${topTask ? "Open task suggests a part request that should move through stock or special order." : "Once a request exists, shelf location and ETA can land here."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Runner Route</small>
            <strong>${appointments.length ? "Bay delivery ready" : "Counter hold"}</strong>
            <span>${appointments.length ? "A robot runner can hand off the part directly to the technician." : "Keep the order staged until the work order is actively in the bay."}</span>
          </div>
        </div>
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "addRepairOrderPartRequest()" : (partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createPartsPickTask()")}"><span>📦</span>${activeRepairOrder ? "Add Part Line" : partsTask ? "Open Pick" : "Create Pick"}</button>
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "createSpecialPartOrder()" : (partsEtaNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(partsEtaNote)}','parts')` : "startPartsEtaNote()")}"><span>⏱</span>${activeRepairOrder ? "Special Order" : partsEtaNote ? "Open ETA" : "Add ETA"}</button>
          <button class="customer360-lens-quickbtn" onclick="${technicianTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(technicianTask)}','technicians')` : "createTechnicianPartsRequest()"}"><span>🤖</span>${technicianTask ? "Return to Tech" : "Route to Tech"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Next Pick</div>
          <div class="customer360-lens-value">${escapeHtml(topTask?.title || "Create parts pick task")}</div>
          <div class="customer360-lens-copy">${escapeHtml(topTask?.description || "Parts should own stock pull, special-order decision, and delivery-to-tech status from this block.")}</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Confirm SKU</b><span>Validate fitment and VIN match before the request leaves the counter.</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Choose source</b><span>${topTask ? "Decide between in-stock pull, transfer, or special order." : "No sourcing decision is required yet."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Dispatch delivery</b><span>Use the same record to send the part to advisor, bay, or robot runner workflow.</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "createSpecialPartOrder()" : "createPartsPickTask()"}">${activeRepairOrder ? "Place Special Order" : "Create Parts Task"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "addRepairOrderPartRequest()" : "startPartsEtaNote()"}">${activeRepairOrder ? "Add Parts to RO" : "Add ETA Note"}</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "accounting") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Ledger</div>
          <div class="customer360-lens-value">${vehicle ? `Open account • ${escapeHtml(vehicleName)}` : "Customer ledger"}</div>
          <div class="customer360-lens-copy">Statements, invoice decisions, and payment events should remain attached to the same customer + VIN spine.</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Invoice State</small>
            <strong>${accountingTasks.length ? `${accountingTasks.length} review${accountingTasks.length === 1 ? "" : "s"} open` : topTask ? "Needs review" : "Draft-ready"}</strong>
            <span>${accountingTasks.length ? `${overdueTasks.length ? `${overdueTasks.length} invoice item${overdueTasks.length === 1 ? "" : "s"} overdue.` : "Accounting review is active across invoice, statement, or collection work."}` : topTask ? "An open accounting task suggests invoice posting or statement follow-up is still pending." : "Use this block for modern QuickBooks-style invoice and statement flow."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Payment Rail</small>
            <strong>Stripe linked</strong>
            <span>Card, refund, and statement workflows can eventually settle here with QuickBooks-style bookkeeping posture.</span>
          </div>
        </div>
        ${buildLaneSignalMarkup(accountingSignals)}
        <div class="customer360-lens-quickbar">
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "createAccountsReceivableInvoice()" : (accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()")}"><span>💳</span>${activeRepairOrder ? "Post AR" : accountingTask ? "Open Invoice" : "Queue Invoice"}</button>
          <button class="customer360-lens-quickbtn" onclick="${ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : "startLedgerNote()"}"><span>📘</span>${ledgerNote ? "Open Ledger" : "Add Ledger"}</button>
          <button class="customer360-lens-quickbtn" onclick="${activeRepairOrder ? "createAccountsPayableBill()" : (partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "queueAccountingInvoiceReview()")}"><span>🧾</span>${activeRepairOrder ? "Add AP" : partsTask ? "Review Parts" : "Prep Statement"}</button>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Next Financial Step</div>
          <div class="customer360-lens-value">${escapeHtml(topTask?.title || "Prepare invoice / statement")}</div>
          <div class="customer360-lens-copy">${escapeHtml(topTask?.description || "Accounting should use this area for statement issue, payment follow-up, refund, and reconciliation actions.")}</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Validate charges</b><span>Review service, parts, and delivery items against the same operating timeline.</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Issue payment request</b><span>Use Stripe-backed collection and customer statement language from this record.</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Reconcile</b><span>${notes.length ? "Recent notes can seed reconciliation comments and customer statement context." : "No reconciliation notes have been captured yet."}</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "createAccountsReceivableInvoice()" : "queueAccountingInvoiceReview()"}">${activeRepairOrder ? "Post AR Invoice" : "Queue Invoice Review"}</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="${activeRepairOrder ? "createAccountsPayableBill()" : "startLedgerNote()"}">${activeRepairOrder ? "Add AP Bill" : "Add Ledger Note"}</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="customer360-lens-card">
      <div class="customer360-lens-row">
        <div class="customer360-lens-label">Core Spine</div>
        <div class="customer360-lens-value">${escapeHtml(customerDisplayName(customer))}</div>
        <div class="customer360-lens-copy">Everything continues to hang off customer, vehicle, and timeline.</div>
      </div>
      <div class="customer360-lens-row">
        <div class="customer360-lens-label">Vehicle Context</div>
        <div class="customer360-lens-value">${escapeHtml(vehicleName)}</div>
        <div class="customer360-lens-copy">${tasks.length} tasks, ${appointments.length} appointments, ${notes.length} notes, ${calls.length} communications.</div>
      </div>
      <div class="customer360-lens-grid">
        <div class="customer360-lens-stat">
          <small>Primary Phone</small>
          <strong>${escapeHtml(formatPhonePretty(contactPhone))}</strong>
          <span>Calls and SMS should always resolve back to this operating record.</span>
        </div>
        <div class="customer360-lens-stat">
          <small>Timeline Load</small>
          <strong>${calls.length + notes.length + appointments.length + tasks.length}</strong>
          <span>Signals across departments continue to converge into one visible timeline.</span>
        </div>
      </div>
    </div>
  `;
}

function inferVehicleBatteryHealth(vehicle, appointments = []) {
  if (!vehicle) return "Unknown";
  if (typeof vehicle.batteryHealth === "number") return `${vehicle.batteryHealth}%`;
  if (typeof vehicle.batteryHealth === "string" && vehicle.batteryHealth.trim()) return vehicle.batteryHealth;
  return appointments.length ? "Monitor" : "Good";
}

function inferVehicleRecallState(vehicle, tasks = []) {
  if (!vehicle) return "Unknown";
  if (Array.isArray(vehicle.recalls) && vehicle.recalls.length) return `${vehicle.recalls.length} open`;
  const recallTasks = tasks.filter((task) => String(task.title || task.description || "").toLowerCase().includes("recall"));
  return recallTasks.length ? `${recallTasks.length} flagged` : "Clear";
}

function inferVehicleMaintenanceState(appointments = [], tasks = []) {
  const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed").length;
  if (appointments.length) return "Scheduled";
  if (openTasks) return "Needs follow-up";
  return "Stable";
}

function getTimelineEventIcon(type = "") {
  const normalized = String(type).toLowerCase();
  if (normalized.includes("vehicle health")) return "🩺";
  if (normalized.includes("vehicle movement")) return "🧭";
  if (normalized.includes("vin archive")) return "🗂";
  if (normalized.includes("call")) return "📞";
  if (normalized.includes("sms") || normalized.includes("message")) return "💬";
  if (normalized.includes("voicemail")) return "📍";
  if (normalized.includes("transcript") || normalized.includes("summary")) return "✦";
  if (normalized.includes("task")) return "🗂";
  if (normalized.includes("appointment")) return "🗓";
  if (normalized.includes("service")) return "🧰";
  if (normalized.includes("payment")) return "💳";
  return "●";
}

function getTimelineVisualTone(item) {
  const type = String(item?.type || "").toLowerCase();
  if (type.includes("vehicle health")) return "vin-health";
  if (type.includes("vehicle movement")) return "vin-movement";
  if (type.includes("vin archive")) return "vin-archive";
  return "";
}

function getVinTimelineSubtype(item) {
  const type = String(item?.type || "").toLowerCase();
  if (type.includes("vehicle health")) return "health";
  if (type.includes("vehicle movement")) return "movement";
  if (type.includes("vin archive")) return "archive";
  return "all";
}

function getVinEmptyStateConfig(subtype = "all") {
  if (subtype === "health") {
    return {
      label: "No health events on this VIN yet.",
      actionLabel: "Log Health Event",
      action: "startVehicleHealthEventNote()"
    };
  }
  if (subtype === "movement") {
    return {
      label: "No movement updates on this VIN yet.",
      actionLabel: "Log Movement",
      action: "startVehicleGeoMovementNote()"
    };
  }
  if (subtype === "archive") {
    return {
      label: "No archive entries on this VIN yet.",
      actionLabel: "Add VIN Archive Entry",
      action: "startVinArchiveEntryNote()"
    };
  }
  return {
    label: "No VIN events on this timeline yet.",
    actionLabel: "Create VIN Event",
    action: "startVehicleHealthEventNote()"
  };
}

function buildCustomerAiSummary(customer, vehicle, calls, timelineEvents, tasks, appointments) {
  const latestSummaryEvent = timelineEvents.find((event) =>
    /summary|transcript/i.test(String(event.eventType || event.title || ""))
  );
  if (latestSummaryEvent?.body) return latestSummaryEvent.body;

  const latestCall = calls[0];
  const nextTask = tasks[0];
  const nextAppointment = appointments[0];
  const customerName = customerDisplayName(customer);
  const vehicleName = vehicleDisplayName(vehicle);
  const callDetail = latestCall?.notes || latestCall?.transcript || "recent communication activity";
  const openTasks = (tasks || []).filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const findTask = (...keywords) => openTasks.find((task) => {
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const bdcTask = findTask("[bdc]", "callback", "follow-up", "reconnect");
  const salesTask = findTask("[sales]", "quote", "deal", "trade", "test drive", "test-drive");
  const serviceTask = findTask("[service]", "advisor", "loaner", "transport", "repair");
  const accountingTask = findTask("[accounting]", "invoice", "statement", "ledger", "payment");

  if (currentDepartmentLens === "service") {
    return nextAppointment
      ? `${customerName} is attached to ${vehicleName} with ${nextAppointment.service || "a service visit"} on the books. Latest context: ${callDetail}. Advisor focus should stay on write-up, promised time, and transportation follow-through.`
      : `${customerName} has active service context on ${vehicleName}. Latest signal: ${callDetail}. Advisor focus should be booking the visit, capturing the concern, and locking the next lane step.`;
  }

  if (currentDepartmentLens === "bdc") {
    return bdcTask
      ? `${customerName} remains live in the BDC queue for ${vehicleName}. Latest contact context: ${callDetail}. Next move is to rescue the callback thread and convert it into a firm appointment commitment.`
      : `${customerName} is still warm for BDC follow-up around ${vehicleName}. Latest contact context: ${callDetail}. Next move is to send a fast reply and pin down the next commitment.`;
  }

  if (currentDepartmentLens === "sales") {
    return salesTask
      ? `${customerName} is active in the sales lane on ${vehicleName}. Latest deal context: ${salesTask.title || "deal step in motion"}. Sales focus should stay on showroom commitment, quote pressure, and clean F&I handoff.`
      : `${customerName} is attached to ${vehicleName} with sales momentum building. Latest context: ${callDetail}. Sales focus should be setting the visit, starting the deal, and moving toward quote review.`;
  }

  if (currentDepartmentLens === "accounting") {
    return accountingTask
      ? `${customerName} has open accounting work tied to ${vehicleName}. Latest back-office context: ${accountingTask.title || "invoice review in motion"}. Accounting focus should stay on review, statement posture, and payment follow-through.`
      : `${customerName} has no active accounting blockers tied to ${vehicleName} right now. Latest context: ${callDetail}. Accounting can stay ready for invoice, statement, or payment activity once the service or sales lane advances.`;
  }

  if (currentDepartmentLens === "technicians") {
    return `${customerName} is attached to ${vehicleName} in the technician lane. Latest shop context: ${callDetail}. Technician focus should stay on findings, media, and clean parts handoff.`;
  }

  if (currentDepartmentLens === "parts") {
    return `${customerName} is attached to ${vehicleName} in the parts lane. Latest operational context: ${callDetail}. Parts focus should stay on sourcing, ETA, and dispatch back to the bay.`;
  }

  if (currentDepartmentLens === "fi") {
    return `${customerName} is attached to ${vehicleName} in the F&I lane. Latest deal context: ${callDetail}. F&I focus should stay on funding readiness, product review, and delivery prep.`;
  }

  const followUp = nextAppointment
    ? `${nextAppointment.service || "service"} appointment recommended`
    : nextTask
      ? `${nextTask.title || "follow-up task"} recommended`
      : "follow-up recommended";
  return `${customerName} contacted the dealership regarding ${vehicleName}. Latest context: ${callDetail}. ${followUp}.`;
}

function buildCustomerSummaryActions({ tasks = [], appointments = [], calls = [], notes = [] } = {}) {
  const openTasks = (tasks || []).filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const findTask = (...keywords) => openTasks.find((task) => {
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const findNote = (...keywords) => (notes || []).find((note) => {
    const haystack = `${note.body || ""} ${note.title || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
  });
  const nextAppointment = appointments[0];
  const latestCall = calls[0];
  const missedCall = calls.find((call) => String(call.status || "").toLowerCase().includes("miss"));
  const latestNote = notes[0];
  const serviceTask = findTask("[service]", "advisor", "loaner", "transport");
  const bdcTask = findTask("[bdc]", "callback", "follow-up", "reconnect");
  const salesTask = findTask("[sales]", "deal", "quote", "trade");
  const accountingTask = findTask("[accounting]", "invoice", "statement", "ledger");
  const fiTask = findTask("[fi]", "finance", "funding", "delivery");
  const technicianTask = findTask("[technician]", "inspection", "diagnostic", "repair");
  const partsTask = findTask("[parts]", "parts request", "stock pull", "eta", "sourcing");
  const advisorNote = findNote("[service]", "advisor", "loaner", "transport");
  const accountingNote = findNote("[accounting]", "ledger", "statement", "payment");
  const partsNote = findNote("[parts]", "eta", "vendor", "runner");
  const technicianNote = findNote("[technician]", "inspection", "finding", "diagnostic");

  if (currentDepartmentLens === "service") {
    return [
      {
        label: nextAppointment ? "Open Visit" : "Schedule Service",
        action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','service')` : "startServiceWriteUp()"
      },
      {
        label: serviceTask ? "Open Advisor Task" : advisorNote ? "Open Advisor Note" : "Add Advisor Note",
        action: serviceTask
          ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(serviceTask.id || serviceTask.taskId || serviceTask.createdAtUtc || serviceTask.title || ""))}','service')`
          : advisorNote
            ? `openCustomer360FocusedArtifact('notes','${escapeHtml(String(advisorNote.id || advisorNote.noteId || advisorNote.createdAtUtc || advisorNote.body || ""))}','service')`
            : "startAdvisorJourneyNote()",
        secondary: true
      }
    ];
  }

  if (currentDepartmentLens === "bdc") {
    return [
      {
        label: bdcTask ? "Open Callback" : missedCall ? "Open Missed Call" : "Queue Callback",
        action: bdcTask
          ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(bdcTask.id || bdcTask.taskId || bdcTask.createdAtUtc || bdcTask.title || ""))}','bdc')`
          : missedCall
            ? `openCustomer360FocusedArtifact('calls','${escapeHtml(String(missedCall.id || missedCall.callId || missedCall.createdAtUtc || missedCall.from || ""))}','bdc')`
            : "startBdcCallbackTask()"
      },
      {
        label: latestCall ? "Open Last Call" : "Send Follow-Up",
        action: latestCall
          ? `openCustomer360FocusedArtifact('calls','${escapeHtml(String(latestCall.id || latestCall.callId || latestCall.createdAtUtc || latestCall.from || ""))}','bdc')`
          : "openSmsForPhone(getSelectedCustomerPrimaryPhone())",
        secondary: true
      }
    ];
  }

  if (currentDepartmentLens === "sales") {
    return [
      {
        label: salesTask ? "Open Deal" : "Start Deal",
        action: salesTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(salesTask.id || salesTask.taskId || salesTask.createdAtUtc || salesTask.title || ""))}','sales')` : "startSalesDealTask()"
      },
      {
        label: nextAppointment ? "Open Visit" : "Schedule Drive",
        action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','sales')` : "startDepartmentAppointmentCreate()",
        secondary: true
      }
    ];
  }

  if (currentDepartmentLens === "accounting") {
    return [
      {
        label: accountingTask ? "Open Review" : "Queue Review",
        action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(accountingTask.id || accountingTask.taskId || accountingTask.createdAtUtc || accountingTask.title || ""))}','accounting')` : "queueAccountingInvoiceReview()"
      },
      {
        label: accountingNote ? "Open Ledger Note" : "Add Ledger Note",
        action: accountingNote
          ? `openCustomer360FocusedArtifact('notes','${escapeHtml(String(accountingNote.id || accountingNote.noteId || accountingNote.createdAtUtc || accountingNote.body || ""))}','accounting')`
          : "startLedgerNote()",
        secondary: true
      }
    ];
  }

  if (currentDepartmentLens === "technicians") {
    return [
      {
        label: technicianTask ? "Open Job" : "Log Finding",
        action: technicianTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(technicianTask.id || technicianTask.taskId || technicianTask.createdAtUtc || technicianTask.title || ""))}','technicians')` : "startTechnicianInspectionNote()"
      },
      {
        label: technicianNote ? "Open Finding" : partsTask ? "Open Parts" : "Request Parts",
        action: technicianNote
          ? `openCustomer360FocusedArtifact('notes','${escapeHtml(String(technicianNote.id || technicianNote.noteId || technicianNote.createdAtUtc || technicianNote.body || ""))}','technicians')`
          : partsTask
            ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(partsTask.id || partsTask.taskId || partsTask.createdAtUtc || partsTask.title || ""))}','parts')`
            : "createTechnicianPartsRequest()",
        secondary: true
      }
    ];
  }

  if (currentDepartmentLens === "parts") {
    return [
      {
        label: partsTask ? "Open Pick" : "Create Pick",
        action: partsTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(partsTask.id || partsTask.taskId || partsTask.createdAtUtc || partsTask.title || ""))}','parts')` : "createPartsPickTask()"
      },
      {
        label: partsNote ? "Open ETA Note" : "Add ETA Note",
        action: partsNote
          ? `openCustomer360FocusedArtifact('notes','${escapeHtml(String(partsNote.id || partsNote.noteId || partsNote.createdAtUtc || partsNote.body || ""))}','parts')`
          : "startPartsEtaNote()",
        secondary: true
      }
    ];
  }

  if (currentDepartmentLens === "fi") {
    return [
      {
        label: fiTask ? "Open F&I Work" : "Open F&I Note",
        action: fiTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(fiTask.id || fiTask.taskId || fiTask.createdAtUtc || fiTask.title || ""))}','fi')` : "startFiReviewNote()"
      },
      {
        label: nextAppointment ? "Open Delivery" : "Prep Delivery",
        action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','fi')` : "startDeliveryHandoffAppointment()",
        secondary: true
      }
    ];
  }

  return [
    {
      label: nextAppointment ? "Open Appointment" : "Create Appointment",
      action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','home')` : "startDepartmentAppointmentCreate()"
    },
    {
      label: openTasks[0] ? "Open Next Task" : "Add Note",
      action: openTasks[0] ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(openTasks[0].id || openTasks[0].taskId || openTasks[0].createdAtUtc || openTasks[0].title || ""))}','home')` : "setCustomer360ComposerMode('note')",
      secondary: true
    }
  ];
}

function presetCustomer360Composer(mode = "note", options = {}) {
  setCustomer360ComposerMode(mode);

  const bodyEl = document.getElementById("customer360ComposerBody");
  const titleEl = document.getElementById("customer360TaskTitle");
  const dueEl = document.getElementById("customer360TaskDueAt");

  if (bodyEl && options.body) bodyEl.value = options.body;
  if (titleEl && typeof options.title === "string") titleEl.value = options.title;
  if (dueEl && options.dueAt) dueEl.value = options.dueAt;

  setCustomer360ComposerStatus(options.status || "");
  bodyEl?.focus();
}

function getDefaultQuickAppointmentService() {
  if (currentDepartmentLens === "sales") return "Test Drive";
  if (currentDepartmentLens === "fi") return "Delivery";
  if (currentDepartmentLens === "bdc") return "Customer Visit";
  return "Service Appointment";
}

function getNextBusinessDateValue() {
  let probe = addDays(new Date(), 1);
  while ([0, 6].includes(probe.getDay())) {
    probe = addDays(probe, 1);
  }
  return toLocalDateInputValue(probe);
}

async function createQuickTaskRecord({ assignedDepartment = currentDepartmentLens, title = "", description = "", dueAt = "", assignedUser = "" } = {}) {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) throw new Error("Select a customer before creating a task.");

  const res = await fetch("/.netlify/functions/tasks-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      assignedDepartment: normalizeDepartmentKey(assignedDepartment || currentDepartmentLens || "service"),
      assignedUser,
      title,
      description,
      priority: "normal",
      dueAtUtc: dueAt ? new Date(dueAt).toISOString() : null
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create task");
  await loadTasks();
  await refreshSelectedCustomer360();
  renderCustomer360();
  return data;
}

async function createQuickAppointmentRecord({ service = "", advisor = "", date = "", time = "", transport = "", notes = "" } = {}) {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) throw new Error("Select a customer before scheduling service.");

  const [firstName = "", ...rest] = customerDisplayName(customer).split(" ");
  const lastName = rest.join(" ");

  const res = await fetch("/.netlify/functions/book-appointment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      firstName,
      lastName,
      phone: customer.phones?.[0] || "",
      email: customer.email || "",
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      year: vehicle?.year ? String(vehicle.year) : "",
      vin: vehicle?.vin || "",
      service,
      advisor,
      date,
      time,
      transport,
      notes
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to schedule service");
  await loadAppointments();
  await refreshSelectedCustomer360();
  renderCustomer360();
  return data;
}

function startTechnicianInspectionNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[TECHNICIAN] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nInspection finding:\n- \nRecommended action:\n- \nMedia captured:\n- `,
    status: "Inspection note template loaded."
  });
}

function createTechnicianPartsRequest() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: vehicle ? `[PARTS] ${vehicleDisplayName(vehicle)} parts request` : `[PARTS] ${customerDisplayName(customer)} parts request`,
    body: `[PARTS] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nPart needed:\nVIN match checked:\nDelivery target:\nSend to: Technician bay / runner`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Parts request task template loaded."
  });
}

function createPartsPickTask() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: vehicle ? `[PARTS] ${vehicleDisplayName(vehicle)} stock pull` : `[PARTS] ${customerDisplayName(customer)} stock pull`,
    body: `[PARTS] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nRequested part / SKU:\nFitment checked:\nSource: Stock / Transfer / Special order\nDelivery route: Counter / Bay / Runner`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Parts pick task template loaded."
  });
}

function startPartsEtaNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[PARTS] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nParts ETA update:\n- Source:\n- ETA:\n- Runner / delivery notes:\n- `,
    status: "Parts ETA note template loaded."
  });
}

function queueAccountingInvoiceReview() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: vehicle ? `[ACCOUNTING] ${vehicleDisplayName(vehicle)} invoice review` : `[ACCOUNTING] ${customerDisplayName(customer)} invoice review`,
    body: `[ACCOUNTING] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nInvoice review:\n- Charges validated:\n- Payment request:\n- Statement status:\n- Reconciliation notes:`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Invoice review task template loaded."
  });
}

function startLedgerNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[ACCOUNTING] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nLedger note:\n- Payment status:\n- Statement update:\n- Refund / credit notes:\n- Reconciliation comment:`,
    status: "Ledger note template loaded."
  });
}

function buildServiceAdvisorTasksMarkup(openTasks = [], appointments = [], vehicle) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const nextAppointment = appointments[0] || null;
  const latestClockEvent = getRepairOrderLatestClockEvent(activeRepairOrder);
  const technicianClockedIn = latestClockEvent?.eventType === "clock_in";
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.taskId || item.appointmentId || item.createdAtUtc || item.title || ""));
  const serviceTasks = openTasks.filter((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes("[service]") || haystack.includes("advisor") || haystack.includes("loaner") || haystack.includes("transport");
  });
  const loanerTask = serviceTasks.find((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes("loaner") || haystack.includes("transport");
  });
  const rows = [
    {
      title: activeRepairOrder ? "Open RO" : "Arrival / Write-Up",
      detail: activeRepairOrder
        ? `${activeRepairOrder.repairOrderNumber || "RO"} • ${titleCase(activeRepairOrder.status || "open")} • ${formatMoney(getRepairOrderAmounts(activeRepairOrder).balance)} balance`
        : nextAppointment
          ? `${nextAppointment.service || "Service visit"} is booked and ready to convert into an RO`
          : `No live RO yet for ${vehicleDisplayName(vehicle)}`,
      actionLabel: activeRepairOrder ? "Open" : nextAppointment ? "Create RO" : "Schedule",
      action: activeRepairOrder ? "setDepartmentLens('service')" : nextAppointment ? "openRepairOrderFrom360()" : "startDepartmentAppointmentCreate()",
      task: serviceTasks[0] || null
    },
    {
      title: "Estimate / Approval",
      detail: activeRepairOrder
        ? `${formatCountLabel((activeRepairOrder.estimateLines || []).length, "estimate line")} • ${formatMoney(getRepairOrderAmounts(activeRepairOrder).total)} current estimate`
        : "No estimate exists until the RO is opened",
      actionLabel: activeRepairOrder ? "Add" : "Prep",
      action: activeRepairOrder ? "addRepairOrderEstimateLine()" : "openRepairOrderFrom360()",
      task: serviceTasks[0] || null
    },
    {
      title: "Technician Dispatch",
      detail: activeRepairOrder
        ? (latestClockEvent ? `${titleCase(String(latestClockEvent.eventType || "").replaceAll("_", " "))} • ${formatDisplayDateTime(latestClockEvent.occurredAtUtc || latestClockEvent.createdAtUtc)}` : "Technician has not clocked onto the RO yet")
        : "Technician assignment starts after the repair order is opened",
      extraHtml: activeRepairOrder ? buildLaborDispatchControls(activeRepairOrder) : "",
      actionLabel: activeRepairOrder ? (technicianClockedIn ? "Clock Out" : "Clock In") : "Open RO",
      action: activeRepairOrder ? (technicianClockedIn ? "addTechnicianClockEvent('clock_out')" : "addTechnicianClockEvent('clock_in')") : "openRepairOrderFrom360()",
      task: serviceTasks[0] || null
    },
    {
      title: "Transportation",
      detail: loanerTask
        ? `${loanerTask.title || "Loaner workflow"} is already active`
        : nextAppointment
          ? "Loaner / shuttle needs confirmation before promised time is final"
          : "No transportation workflow has been started yet",
      actionLabel: loanerTask ? "Open" : "Start",
      action: loanerTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(loanerTask)}','service')` : "startLoanerTask()",
      task: loanerTask
    }
  ];

  return rows.map((row) => buildTaskWorkflowRow(row, "service")).join("");
}

function buildServiceAdvisorNotesMarkup(notes = [], appointments = []) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const nextAppointment = appointments[0] || null;
  const latestNote = notes[0] || null;
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.noteId || item.createdAtUtc || item.body || item.title || ""));
  const rows = [
    {
      label: "Customer Concern",
      detail: activeRepairOrder?.complaint || latestNote?.body?.slice(0, 90) || "No advisor concern note recorded yet",
      extraHtml: nextAppointment ? buildAppointmentAdvisorControls(nextAppointment) : "",
      actionLabel: latestNote ? "Open" : "Add",
      action: latestNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(latestNote)}','service')` : "startAdvisorJourneyNote()"
    },
    {
      label: "Promised Time",
      detail: activeRepairOrder?.promiseAtUtc
        ? `Promised ${formatDisplayDateTime(activeRepairOrder.promiseAtUtc)}`
        : nextAppointment
          ? `${nextAppointment.date || ""} ${nextAppointment.time || ""}`.trim() || "Visit scheduled without promised-time note"
          : "No promised-time anchor on the record yet",
      actionLabel: nextAppointment ? "Open" : "Set",
      action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','service')` : "startDepartmentAppointmentCreate()"
    },
    {
      label: "Authorization Trail",
      detail: activeRepairOrder
        ? `${formatCountLabel((activeRepairOrder.accountingEntries || []).length, "payment or auth entry")} tied to the RO`
        : "No approval / payment trail until the RO is active",
      extraHtml: activeRepairOrder ? buildAccountingHandoffControls(activeRepairOrder) : "",
      actionLabel: activeRepairOrder ? "Split" : "Prep",
      action: activeRepairOrder ? "addRepairOrderPaySplit('customer')" : "openRepairOrderFrom360()"
    }
  ];

  return rows.map((row) => `
    <div class="customer360-panel-item">
      <div class="customer360-panel-item-body">
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
        ${row.extraHtml || ""}
      </div>
      <button class="customer360-panel-action" onclick="${row.action}">${escapeHtml(row.actionLabel)}</button>
    </div>
  `).join("");
}

function buildTechnicianTasksMarkup(openTasks = [], vehicle) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const latestClockEvent = getRepairOrderLatestClockEvent(activeRepairOrder);
  const technicianTask = openTasks.find((item) => `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[technician]")) || openTasks[0] || null;
  const partsTask = (currentTasks || []).find((item) => item.customerId === selectedCustomerId && String(item.status || "").toLowerCase() !== "completed" && `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[parts]"));
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.taskId || item.createdAtUtc || item.title || ""));
  const inspectionStages = [
    {
      title: "Digital inspection",
      detail: activeRepairOrder ? `${activeRepairOrder.repairOrderNumber || "RO"} • ${(activeRepairOrder.multiPointInspections || []).length} MPI item(s) • ${(activeRepairOrder.partLines || []).length} part line(s)` : (openTasks[0]?.title || `Open findings for ${vehicleDisplayName(vehicle)}`),
      tone: openTasks.length ? "info" : "warn",
      actionLabel: activeRepairOrder ? "Add MPI" : technicianTask ? "Open" : "Start",
      action: activeRepairOrder ? "addRepairOrderInspection()" : technicianTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(technicianTask)}','technicians')` : "startTechnicianInspectionNote()",
      task: technicianTask
    },
    {
      title: "Labor dispatch",
      detail: activeRepairOrder ? `${(activeRepairOrder.laborOps || []).length} labor op(s) on the RO` : "Open RO before assigning flat-rate work",
      tone: activeRepairOrder ? "warn" : "info",
      actionLabel: activeRepairOrder ? "Dispatch" : "Prep",
      action: activeRepairOrder ? "addRepairOrderLaborOp()" : "openRepairOrderFrom360()",
      task: technicianTask
    },
    {
      title: "Parts handoff",
      detail: openTasks.length ? "Queue robot runner or parts counter request" : "No active parts request yet",
      tone: openTasks.length ? "warn" : "good",
      actionLabel: activeRepairOrder ? "Order" : partsTask ? "Open" : "Send",
      action: activeRepairOrder ? "createSpecialPartOrder()" : partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createTechnicianPartsRequest()",
      task: partsTask || technicianTask
    },
    {
      title: "Advisor approval",
      detail: latestClockEvent ? `${titleCase(String(latestClockEvent.eventType || "").replaceAll("_", " "))} at ${formatDisplayDateTime(latestClockEvent.occurredAtUtc || latestClockEvent.createdAtUtc)}` : "Return recommendation and media to the advisor timeline",
      tone: "info",
      actionLabel: "Notify",
      action: "startAdvisorJourneyNote()",
      task: technicianTask
    }
  ];

  return inspectionStages.map((stage) => buildTaskWorkflowRow(stage, "technicians")).join("");
}

function buildTechnicianNotesMarkup(notes = [], calls = []) {
  const latestNote = notes[0];
  const latestRoMedia = getRepairOrderMediaAssets(getActiveRepairOrderRecord())[0];
  const latestArchiveMedia = getVinArchiveMediaAssets()[0];
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.noteId || item.callId || item.createdAtUtc || item.body || item.title || ""));
  const mediaRows = [
    {
      label: "Photo set",
      detail: latestRoMedia ? `${latestRoMedia.fileName || "RO media"} saved to the active RO` : "Start with under-vehicle or concern-area photos",
      actionLabel: latestRoMedia ? "Open" : "Add",
      action: latestRoMedia ? `window.open('${escapeHtml(String(latestRoMedia.storageUrl || ""))}','_blank')` : "captureTechnicianMedia('repair_order','photo')"
    },
    {
      label: "Video walkthrough",
      detail: latestArchiveMedia ? `${latestArchiveMedia.fileName || "VIN media"} captured for archive context` : "Record a technician video tied to the VIN archive",
      actionLabel: latestArchiveMedia ? "Open" : "Record",
      action: latestArchiveMedia ? `window.open('${escapeHtml(String(latestArchiveMedia.storageUrl || ""))}','_blank')` : "captureTechnicianMedia('vin_archive','video')"
    },
    {
      label: "Approval return",
      detail: latestNote ? "Push technician findings back into the advisor/customer timeline" : "Return findings and media to the advisor once inspection is done",
      actionLabel: "Send",
      action: "startAdvisorJourneyNote()"
    }
  ];

  return mediaRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <button class="customer360-panel-action" onclick="${row.action}">${escapeHtml(row.actionLabel)}</button>
    </div>
  `).join("");
}

function buildPartsTasksMarkup(openTasks = [], appointments = [], vehicle) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const partsTask = openTasks.find((item) => `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[parts]")) || openTasks[0] || null;
  const technicianTask = (currentTasks || []).find((item) => item.customerId === selectedCustomerId && String(item.status || "").toLowerCase() !== "completed" && `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[technician]"));
  const nextAppointment = appointments[0];
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.taskId || item.appointmentId || item.createdAtUtc || item.title || ""));
  const sourcingRows = [
    {
      title: "Stock pull",
      detail: activeRepairOrder ? `${activeRepairOrder.repairOrderNumber || "RO"} • ${(activeRepairOrder.partLines || []).length} part line(s) attached` : (openTasks[0]?.title || `Open pick flow for ${vehicleDisplayName(vehicle)}`),
      tone: openTasks.length ? "warn" : "info",
      actionLabel: partsTask ? "Open" : "Create",
      action: partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createPartsPickTask()",
      task: partsTask
    },
    {
      title: "Source decision",
      detail: activeRepairOrder ? `${(currentPartOrders || []).length} live part order(s) • ${formatMoney(getRepairOrderAmounts(activeRepairOrder).parts)} on the RO` : (openTasks.length ? "Choose in-stock, transfer, or special order" : "No active SKU routing yet"),
      tone: openTasks.length ? "info" : "good",
      actionLabel: activeRepairOrder ? "Order" : partsTask ? "Review" : "Start",
      action: activeRepairOrder ? "createSpecialPartOrder()" : partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createPartsPickTask()",
      task: partsTask
    },
    {
      title: "Dispatch",
      detail: appointments.length ? "Runner can route to active bay" : "Stage at counter until bay is ready",
      tone: appointments.length ? "warn" : "info",
      actionLabel: nextAppointment ? "Open" : technicianTask ? "Return" : "Prep",
      action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','parts')` : technicianTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(technicianTask)}','technicians')` : "createTechnicianPartsRequest()",
      task: partsTask || technicianTask
    }
  ];

  return sourcingRows.map((row) => buildTaskWorkflowRow(row, "parts")).join("");
}

function buildPartsNotesMarkup(notes = [], appointments = []) {
  const partsNote = notes.find((item) => `${item.body || ""}`.toLowerCase().includes("[parts]")) || notes[0] || null;
  const partsTask = (currentTasks || []).find((item) => item.customerId === selectedCustomerId && String(item.status || "").toLowerCase() !== "completed" && `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[parts]"));
  const livePartOrder = (currentPartOrders || [])[0] || null;
  const nextAppointment = appointments[0];
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.noteId || item.taskId || item.appointmentId || item.createdAtUtc || item.body || item.title || ""));
  const dispatchRows = [
    {
      label: "ETA updates",
      detail: livePartOrder ? `${livePartOrder.partNumber || "Part"} • ${titleCase(livePartOrder.status || "ordered")} • ETA ${formatDisplayDateTime(livePartOrder.etaAtUtc || livePartOrder.updatedAtUtc || livePartOrder.createdAtUtc)}` : notes.length ? `${notes.length} parts-side notes captured for customer follow-up` : "No ETA note has been recorded yet",
      actionLabel: partsNote ? "Open" : "Add",
      action: partsNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(partsNote)}','parts')` : "startPartsEtaNote()"
    },
    {
      label: "Runner dispatch",
      detail: appointments.length ? "Bay delivery can be queued against the active visit" : "No active lane visit, so keep dispatch staged",
      actionLabel: nextAppointment ? "Open" : partsTask ? "Open" : "Prep",
      action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${getArtifactSourceId(nextAppointment)}','parts')` : partsTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(partsTask)}','parts')` : "createPartsPickTask()"
    },
    {
      label: "Vendor status",
      detail: "Track transfer, special order, and backorder posture here",
      actionLabel: partsNote ? "Review" : "Log",
      action: partsNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(partsNote)}','parts')` : "startPartsEtaNote()"
    }
  ];

  return dispatchRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <button class="customer360-panel-action" onclick="${row.action}">${escapeHtml(row.actionLabel)}</button>
    </div>
  `).join("");
}

function buildAccountingTasksMarkup(openTasks = [], vehicle) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const accountingTask = openTasks.find((item) => `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[accounting]")) || openTasks[0] || null;
  const ledgerNote = (currentCustomerNotes || []).find((item) => item.customerId === selectedCustomerId && (`${item.body || ""}`.toLowerCase().includes("[accounting]") || `${item.body || ""}`.toLowerCase().includes("ledger")));
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.taskId || item.noteId || item.createdAtUtc || item.title || item.body || ""));
  const ledgerRows = [
    {
      title: "Invoice review",
      detail: activeRepairOrder ? `${activeRepairOrder.repairOrderNumber || "RO"} • ${(currentAccountsReceivableInvoices || []).length} AR invoice(s) • ${formatMoney(getRepairOrderAmounts(activeRepairOrder).balance)} still due` : (openTasks[0]?.title || `Review charges for ${vehicleDisplayName(vehicle)}`),
      tone: openTasks.length ? "warn" : "info",
      actionLabel: activeRepairOrder ? "Post AR" : accountingTask ? "Open" : "Queue",
      action: activeRepairOrder ? "createAccountsReceivableInvoice()" : accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()",
      task: accountingTask
    },
    {
      title: "Payment request",
      detail: activeRepairOrder ? `${formatCountLabel((activeRepairOrder.accountingEntries || []).length, "accounting entry")} • ${(currentAccountsPayableBills || []).length} AP bill(s) • ${formatMoney(getRepairOrderAmounts(activeRepairOrder).paid)} already applied` : (openTasks.length ? "Stripe collection or statement follow-up is active" : "No active collection workflow yet"),
      tone: openTasks.length ? "info" : "good",
      actionLabel: activeRepairOrder ? "Post AP" : ledgerNote ? "Open" : "Add",
      action: activeRepairOrder ? "createAccountsPayableBill()" : ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : "startLedgerNote()",
      task: accountingTask
    },
    {
      title: "Reconciliation",
      detail: "Close ledger loop against service, parts, and delivery activity",
      tone: "info",
      actionLabel: accountingTask ? "Review" : "Prep",
      action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()",
      task: accountingTask
    }
  ];

  return ledgerRows.map((row) => buildTaskWorkflowRow(row, "accounting")).join("");
}

function buildAccountingNotesMarkup(notes = []) {
  const ledgerNote = notes.find((item) => `${item.body || ""}`.toLowerCase().includes("[accounting]") || `${item.body || ""}`.toLowerCase().includes("ledger")) || notes[0] || null;
  const accountingTask = (currentTasks || []).find((item) => item.customerId === selectedCustomerId && String(item.status || "").toLowerCase() !== "completed" && `${item.title || ""} ${item.description || ""}`.toLowerCase().includes("[accounting]"));
  const latestInvoice = (currentAccountsReceivableInvoices || [])[0] || null;
  const latestBill = (currentAccountsPayableBills || [])[0] || null;
  const getArtifactSourceId = (item = {}) => escapeHtml(String(item.id || item.noteId || item.taskId || item.createdAtUtc || item.body || item.title || ""));
  const statementRows = [
    {
      label: "Statement status",
      detail: latestInvoice ? `${latestInvoice.invoiceNumber || "Invoice"} • ${titleCase(latestInvoice.status || "open")} • ${formatMoney(latestInvoice.balanceDue || latestInvoice.amount || 0)}` : notes.length ? `${notes.length} accounting notes available for customer statement context` : "No statement notes captured yet",
      actionLabel: ledgerNote ? "Open" : "Add",
      action: ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : "startLedgerNote()"
    },
    {
      label: "Payment rail",
      detail: latestBill ? `${latestBill.invoiceNumber || "AP bill"} • ${titleCase(latestBill.status || "open")} • ${formatMoney(latestBill.amount || 0)}` : "Stripe-backed payment, refund, and collection posture should sit here",
      actionLabel: accountingTask ? "Review" : "Queue",
      action: accountingTask ? `openCustomer360FocusedArtifact('tasks','${getArtifactSourceId(accountingTask)}','accounting')` : "queueAccountingInvoiceReview()"
    },
    {
      label: "Reconciliation trail",
      detail: "Keep QuickBooks-style ledger comments tied to the same customer + VIN record",
      actionLabel: ledgerNote ? "Open" : "Log",
      action: ledgerNote ? `openCustomer360FocusedArtifact('notes','${getArtifactSourceId(ledgerNote)}','accounting')` : "startLedgerNote()"
    }
  ];

  return statementRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <button class="customer360-panel-action" onclick="${row.action}">${escapeHtml(row.actionLabel)}</button>
    </div>
  `).join("");
}

function getJourneyArtifactTag() {
  if (currentDepartmentLens === "bdc") return "[BDC]";
  if (currentDepartmentLens === "sales") return "[SALES]";
  if (currentDepartmentLens === "fi") return "[FI]";
  if (currentDepartmentLens === "service") return "[SERVICE]";
  if (currentDepartmentLens === "technicians") return "[TECHNICIAN]";
  if (currentDepartmentLens === "parts") return "[PARTS]";
  if (currentDepartmentLens === "accounting") return "[ACCOUNTING]";
  return "";
}

function getJourneyArtifactLabel() {
  if (currentDepartmentLens === "bdc") return "bdc";
  if (currentDepartmentLens === "sales") return "sales";
  if (currentDepartmentLens === "fi") return "f&i";
  if (currentDepartmentLens === "service") return "service advisor";
  if (currentDepartmentLens === "technicians") return "technician";
  if (currentDepartmentLens === "parts") return "parts";
  if (currentDepartmentLens === "accounting") return "accounting";
  return "department";
}

function stampJourneyArtifact(text = "") {
  const trimmed = String(text || "").trim();
  const tag = getJourneyArtifactTag();
  if (!tag) return trimmed;
  return trimmed.startsWith(tag) ? trimmed : `${tag} ${trimmed}`.trim();
}

function inferJourneyHandoffTarget(...values) {
  const haystack = values.join(" ").toLowerCase();
  if (haystack.includes("[parts]")) return "parts";
  if (haystack.includes("[accounting]")) return "accounting";
  return "";
}

function startServiceWriteUp() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("appointment", {
    body: `[SERVICE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nWrite-up summary:\n- Concern:\n- Promised time:\n- Transportation:\n- Advisor notes:`,
    status: "Service write-up template loaded."
  });
}

async function openRepairOrderFrom360() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const existing = getActiveRepairOrderRecord();
  if (!customer || existing) {
    if (existing) {
      setCustomer360ComposerStatus(`RO ${existing.repairOrderNumber || "open"} is already active.`, "success");
    }
    return;
  }

  const nextAppointment = (currentAppointments || []).find((item) => item.customerId === customer.id && String(item.status || "").toLowerCase() !== "completed") || null;
  const openTasks = (currentTasks || []).filter((task) => task.customerId === customer.id && String(task.status || "").toLowerCase() !== "completed");

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        vehicleId: vehicle?.id || null,
        appointmentId: nextAppointment?.id || null,
        advisor: nextAppointment?.advisor || "Rachel Smith",
        complaint: nextAppointment?.service || openTasks[0]?.description || "Customer concern captured from 360 service lane",
        odometerIn: vehicle?.mileage || null,
        transportOption: nextAppointment?.transport || "",
        notes: nextAppointment?.notes || "",
        promiseAtUtc: nextAppointment?.scheduledStartUtc || null
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to open repair order");
    await loadAppointments();
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Repair order ${data.repairOrderNumber || data.repairOrder?.repairOrderNumber || "opened"} created.`, "success");
  } catch (err) {
    console.error("openRepairOrderFrom360 error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to open repair order.", "error");
  }
}

async function closeActiveRepairOrder() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("No active repair order to close.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        status: "closed",
        notes: "Closed from Customer + Vehicle 360"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to close repair order");
    await loadAppointments();
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Repair order ${repairOrder.repairOrderNumber || "closed"} closed.`, "success");
  } catch (err) {
    console.error("closeActiveRepairOrder error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to close repair order.", "error");
  }
}

async function addRepairOrderEstimateLine() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before adding an estimate.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-estimate-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        lineType: "labor",
        opCode: "DIAG",
        description: "Diagnostic inspection and advisor estimate",
        quantity: 1,
        unitPrice: 149,
        department: "service",
        status: "open"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add estimate line");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Estimate line added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addRepairOrderEstimateLine error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add estimate line.", "error");
  }
}

async function addRepairOrderPartRequest() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before adding parts.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-part-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        partNumber: "PART-REQ",
        description: "Requested service part",
        quantity: 1,
        unitPrice: 0,
        status: "requested",
        source: "stock"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add parts line");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Parts request added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addRepairOrderPartRequest error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add parts request.", "error");
  }
}

async function addTechnicianClockEvent(eventType = "clock_in") {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before clocking a technician.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        technicianName: "Miguel Santos",
        eventType,
        laborOpCode: "DIAG",
        notes: eventType === "clock_in" ? "Technician started work from 360." : "Technician finished work from 360."
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to save technician clock event");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Technician ${eventType === "clock_in" ? "clocked in" : "clocked out"} on ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addTechnicianClockEvent error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to save technician clock event.", "error");
  }
}

async function addAccountingRepairOrderEntry() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before posting accounting.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-accounting-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        entryType: "payment_request",
        description: "Payment request staged from Customer + Vehicle 360",
        amount: Number(repairOrder.balanceDue || repairOrder.totalEstimate || 0),
        status: "open"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add accounting entry");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Accounting entry added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addAccountingRepairOrderEntry error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add accounting entry.", "error");
  }
}

async function addRepairOrderLaborOp() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before dispatching labor.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-labor-op", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        opCode: "DIAG",
        description: "Diagnostic and dispatch labor op",
        technicianName: "Miguel Santos",
        soldHours: 1.5,
        flatRateHours: 1.2,
        actualHours: 0,
        dispatchStatus: "dispatched",
        payType: "customer",
        dispatchedAtUtc: new Date().toISOString()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add labor op");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Labor op added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addRepairOrderLaborOp error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add labor op.", "error");
  }
}

async function addRepairOrderInspection() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before recording MPI items.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-inspection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        category: "Brakes",
        itemName: "Front brake pad measurement",
        result: "yellow",
        severity: "attention",
        notes: "Pads nearing replacement threshold.",
        technicianName: "Miguel Santos",
        inspectedAtUtc: new Date().toISOString()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add MPI item");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`MPI item added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addRepairOrderInspection error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add MPI item.", "error");
  }
}

async function addRepairOrderWarrantyClaim() {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before starting a warranty claim.", "error");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-warranty-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        claimType: "warranty",
        opCode: "DIAG",
        failureCode: "CHKENG",
        cause: "Check engine light concern",
        correction: "Diagnostic and warranty review",
        claimAmount: 149,
        status: "submitted",
        submittedAtUtc: new Date().toISOString()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add warranty claim");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Warranty claim added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addRepairOrderWarrantyClaim error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add warranty claim.", "error");
  }
}

async function addRepairOrderPaySplit(payType = "customer") {
  const repairOrder = getActiveRepairOrderRecord();
  if (!repairOrder) {
    setCustomer360ComposerStatus("Open a repair order before setting pay splits.", "error");
    return;
  }

  const total = Number(repairOrder.totalEstimate || repairOrder.balanceDue || 0);
  const amount = payType === "warranty" ? Math.max(0, total * 0.6) : payType === "internal" ? Math.max(0, total * 0.15) : Math.max(0, total);

  try {
    const res = await fetch("/.netlify/functions/service-repair-order-pay-split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        payType,
        amount,
        percentage: total > 0 ? amount / total : 0,
        status: "open",
        notes: `${titleCase(payType)} split staged from Customer + Vehicle 360`
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to add pay split");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`${titleCase(payType)} pay split added to ${repairOrder.repairOrderNumber || "active RO"}.`, "success");
  } catch (err) {
    console.error("addRepairOrderPaySplit error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to add pay split.", "error");
  }
}

async function createSpecialPartOrder() {
  const repairOrder = getActiveRepairOrderRecord();
  try {
    const res = await fetch("/.netlify/functions/parts-order-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder?.id || null,
        partNumber: "OEM-SO-001",
        vendor: "OEM",
        orderType: "special_order",
        quantity: 1,
        unitCost: 89,
        status: "ordered",
        isSpecialOrder: true,
        etaAtUtc: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create part order");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`Special order ${data.partNumber || "created"} queued for parts.`, "success");
  } catch (err) {
    console.error("createSpecialPartOrder error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create special order.", "error");
  }
}

async function createAccountsPayableBill() {
  const repairOrder = getActiveRepairOrderRecord();
  try {
    const res = await fetch("/.netlify/functions/accounting-ap-bill-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder?.id || null,
        vendorName: "OEM Parts Vendor",
        invoiceNumber: `AP-${Date.now().toString().slice(-6)}`,
        amount: 89,
        status: "open",
        dueAtUtc: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create AP bill");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`AP bill ${data.invoiceNumber || "created"} added.`, "success");
  } catch (err) {
    console.error("createAccountsPayableBill error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create AP bill.", "error");
  }
}

async function createAccountsReceivableInvoice() {
  const repairOrder = getActiveRepairOrderRecord();
  const customer = getSelectedCustomerRecord();
  if (!repairOrder || !customer) {
    setCustomer360ComposerStatus("Open a repair order before posting an AR invoice.", "error");
    return;
  }

  try {
    const total = Number(repairOrder.balanceDue || repairOrder.totalEstimate || 0);
    const res = await fetch("/.netlify/functions/accounting-ar-invoice-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId: repairOrder.id,
        customerId: customer.id,
        invoiceNumber: `AR-${Date.now().toString().slice(-6)}`,
        amount: total,
        balanceDue: total,
        status: "open",
        dueAtUtc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create AR invoice");
    await refreshSelectedCustomer360();
    renderCustomer360();
    setCustomer360ComposerStatus(`AR invoice ${data.invoiceNumber || "created"} posted.`, "success");
  } catch (err) {
    console.error("createAccountsReceivableInvoice error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create AR invoice.", "error");
  }
}

async function captureTechnicianMedia(contextType = "repair_order", preferredMediaType = "photo") {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const repairOrder = getActiveRepairOrderRecord();
  const input = document.createElement("input");
  input.type = "file";
  input.accept = preferredMediaType === "video" ? "video/*" : "image/*,video/*";
  input.setAttribute("capture", "environment");

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const caption = window.prompt("Caption for this media:", `${titleCase(contextType.replaceAll("_", " "))} evidence`) || "";

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/.netlify/functions/media-upload", {
        method: "POST",
        body: formData
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload media");

      const mediaType = String(file.type || "").toLowerCase().startsWith("video/") ? "video" : "photo";
      const createRes = await fetch("/.netlify/functions/media-assets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id || null,
          vehicleId: vehicle?.id || null,
          repairOrderId: contextType === "repair_order" ? repairOrder?.id || null : null,
          contextType,
          mediaType,
          storageUrl: uploadData.storageUrl,
          thumbnailUrl: uploadData.thumbnailUrl,
          fileName: uploadData.fileName || file.name,
          caption,
          capturedBy: "Miguel Santos",
          visibility: "internal",
          capturedAtUtc: new Date().toISOString()
        })
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(createData.error || "Failed to create media record");

      await refreshSelectedCustomer360();
      renderCustomer360();
      setCustomer360ComposerStatus(`${titleCase(mediaType)} saved to ${contextType === "repair_order" ? (repairOrder?.repairOrderNumber || "repair order") : "VIN archive"}.`, "success");
    } catch (err) {
      console.error("captureTechnicianMedia error:", err);
      setCustomer360ComposerStatus(err.message || "Unable to capture technician media.", "error");
    }
  };

  input.click();
}

function startAdvisorJourneyNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[SERVICE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nAdvisor follow-up:\n- Concern verified:\n- Next action for technician:\n- Customer expectation:`,
    status: "Advisor note template loaded."
  });
}

async function startBdcCallbackTask() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) {
    setCustomer360ComposerStatus("Select a customer before creating a callback task.", "error");
    return;
  }

  const detail = window.prompt(
    "BDC callback notes",
    "Last contact result:\nNext outreach step:\nAppointment goal:\nHandoff notes for sales:"
  );
  if (detail === null) return;

  try {
    await createQuickTaskRecord({
      assignedDepartment: "bdc",
      title: `[BDC] ${vehicleDisplayName(vehicle)} callback`,
      description: `[BDC] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\n${detail.trim() || "Customer callback queued."}`,
      dueAt: toLocalDateInputValue(new Date())
    });
    setCustomer360ComposerStatus("BDC callback task created.", "success");
  } catch (err) {
    console.error("startBdcCallbackTask error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create BDC callback task.", "error");
  }
}

async function startSalesDealTask() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) {
    setCustomer360ComposerStatus("Select a customer before creating a deal task.", "error");
    return;
  }

  const detail = window.prompt(
    "Sales deal notes",
    "Quote status:\nTrade / appraisal notes:\nTest-drive or showroom plan:\nHandoff notes for F&I:"
  );
  if (detail === null) return;

  try {
    await createQuickTaskRecord({
      assignedDepartment: "sales",
      title: `[SALES] ${vehicleDisplayName(vehicle)} opportunity review`,
      description: `[SALES] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\n${detail.trim() || "Sales opportunity review queued."}`,
      dueAt: toLocalDateInputValue(new Date())
    });
    setCustomer360ComposerStatus("Sales deal task created.", "success");
  } catch (err) {
    console.error("startSalesDealTask error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create sales deal task.", "error");
  }
}

function startFiReviewNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[FI] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nFinance / funding review:\n- Menu products discussed:\n- Funding status:\n- Warranty notes:\n- Delivery readiness:`,
    status: "F&I review template loaded."
  });
}

async function startDeliveryHandoffAppointment() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) {
    setCustomer360ComposerStatus("Select a customer before booking delivery.", "error");
    return;
  }

  const date = window.prompt("Delivery date (YYYY-MM-DD)", getNextBusinessDateValue())?.trim();
  if (date === null) return;
  const time = window.prompt("Delivery time (HH:MM)", "15:00")?.trim();
  if (time === null) return;
  const notes = window.prompt(
    "Delivery notes",
    `Pickup readiness:\nFinal documents confirmed:\nDelivery specialist notes:\nCustomer celebration details:`
  );
  if (notes === null) return;

  try {
    await createQuickAppointmentRecord({
      service: "Delivery",
      advisor: "Delivery Desk",
      date,
      time,
      transport: "pickup",
      notes: `[DELIVERY] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\n${notes.trim() || "Delivery handoff booked."}`
    });
    setCustomer360ComposerStatus("Delivery appointment created.", "success");
  } catch (err) {
    console.error("startDeliveryHandoffAppointment error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create delivery appointment.", "error");
  }
}

function startVehicleHealthEventNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[VEHICLE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nVehicle health event:\n- Battery state:\n- Mileage update:\n- Recall / maintenance signal:\n- Recommended next step:`,
    status: "Vehicle health event template loaded."
  });
}

function startVinArchiveEntryNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[ARCHIVE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nVIN archive entry:\n- File / media type:\n- Source:\n- Notes:\n- Linked department:`,
    status: "VIN archive entry template loaded."
  });
}

function startLoanerTask() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: `[SERVICE] ${vehicleDisplayName(vehicle)} loaner coordination`,
    body: `[SERVICE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nLoaner / transport workflow:\n- Transportation need:\n- Loaner approved:\n- Pickup / return notes:\n- Advisor follow-up:`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Loaner coordination task template loaded."
  });
}

function startVehicleGeoMovementNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `[VEHICLE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nGeo / movement update:\n- Current zone:\n- Next destination:\n- Dispatch or lane note:\n- Responsible team:`,
    status: "Vehicle movement note template loaded."
  });
}

function hasKeywordMatch(items = [], keywords = []) {
  return items.some((item) => {
    const haystack = `${item.title || ""} ${item.description || ""} ${item.body || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

function getJourneyStageOwner(stageKey = "", status = "") {
  if (status === "complete") return "Completed";
  if (stageKey === "bdc") return status === "active" ? "BDC" : "Communications";
  if (stageKey === "sales") return status === "active" ? "Sales" : "Sales Desk";
  if (stageKey === "service") return status === "active" ? "Advisor" : "Front Desk";
  if (stageKey === "technicians") return status === "active" ? "Technician" : "Shop";
  if (stageKey === "fi") return status === "active" ? "F&I" : "Finance";
  if (stageKey === "delivery") return status === "active" ? "Delivery" : "Sales";
  if (stageKey === "parts") return status === "active" ? "Parts Counter" : "Inventory";
  if (stageKey === "accounting") return status === "active" ? "Accounting" : "Back Office";
  return "INGRID";
}

function getJourneyAssigneeKey(stageKey = "") {
  return `${selectedCustomerId || "global"}:${stageKey}`;
}

function getJourneyStageLens(stageKey = "") {
  if (stageKey === "delivery") return "sales";
  return stageKey;
}

function getTimelineJourneyAssignment(stageKey = "") {
  return (currentCustomerTimeline || []).find((event) => {
    const sourceId = String(event.sourceId || "").toLowerCase();
    const eventType = String(event.eventType || "").toLowerCase();
    const department = String(event.department || "").toLowerCase();
    return eventType === "journey_assignment" && sourceId === `journey-assignment:${stageKey}` && department === stageKey;
  }) || null;
}

function getJourneyAssignedOwner(stageKey = "", status = "") {
  const timelineAssignment = getTimelineJourneyAssignment(stageKey);
  if (timelineAssignment?.body) return String(timelineAssignment.body);
  const assigned = customer360AssigneeMap[getJourneyAssigneeKey(stageKey)];
  return assigned || getJourneyStageOwner(stageKey, status);
}

function renderJourneyAssigneeOptions(stageKey = "", selectedOwner = "") {
  const options = JOURNEY_ASSIGNEE_DIRECTORY[stageKey] || [];
  const current = selectedOwner || getJourneyAssignedOwner(stageKey, "active");
  return options.map((name) => `
    <option value="${escapeHtml(name)}" ${name === current ? "selected" : ""}>${escapeHtml(name)}</option>
  `).join("");
}

async function persistJourneyAssignee(stageKey = "", owner = "") {
  const customer = getSelectedCustomerRecord();
  if (!customer) return;

  const vehicle = getSelectedVehicleRecord();
  const response = await fetch("/.netlify/functions/timeline-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      eventType: "journey_assignment",
      title: `${titleCase(stageKey)} owner reassigned`,
      body: owner,
      department: stageKey,
      sourceSystem: "ingrid-web",
      sourceId: `journey-assignment:${stageKey}`,
      occurredAtUtc: new Date().toISOString()
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Unable to persist journey assignment.");
  }
}

function buildLaneSignalMarkup(signals = []) {
  const activeSignals = signals.filter(Boolean);
  if (!activeSignals.length) return "";
  return `
    <div class="customer360-lane-signals">
      ${activeSignals.map((signal) => `
        <button type="button" class="customer360-lane-signal ${escapeHtml(signal.tone || "info")}" ${signal.action ? `onclick="${signal.action}"` : ""} title="${escapeHtml(signal.detail || signal.label || "Open signal")}">
          <small>${escapeHtml(signal.label || "Signal")}</small>
          <strong>${escapeHtml(signal.value || "0")}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

function buildServiceSignalMarkup(signals = []) {
  const activeSignals = signals.filter(Boolean);
  if (!activeSignals.length) return "";
  return `
    <div class="customer360-service-signals">
      ${activeSignals.map((signal) => `
        <button type="button" class="customer360-service-signal ${escapeHtml(signal.tone || "info")}" ${signal.action ? `onclick="${signal.action}"` : ""} title="${escapeHtml(signal.detail || signal.label || "Open signal")}">
          <span>${escapeHtml(signal.label || "Signal")}</span>
          <strong>${escapeHtml(signal.value || "0")}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

function getManagerQueueFreshnessLabel(value, label = "Moved") {
  if (!value) return "";
  try {
    return `${label} ${formatDisplayDateTime(value)}`;
  } catch {
    return "";
  }
}

function getManagerQueueSortTimestamp(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getManagerQueueUrgencyRank(card = {}) {
  const toneScore = card.tone === "danger"
    ? 3
    : card.tone === "warn"
      ? 2
      : card.tone === "info"
        ? 1
        : 0;
  const reasonScore = card.priorityReason ? 1 : 0;
  return toneScore * 10 + reasonScore;
}

function setCustomer360ManagerQueueSort(mode = "urgent") {
  currentManagerQueueSort = ["urgent", "recent", "stale"].includes(mode) ? mode : "urgent";
  localStorage.setItem("customer360ManagerQueueSort", currentManagerQueueSort);
  renderCustomer360Detail();
}

function getManagerQueueSortCopy(mode = "urgent", count = 0) {
  const laneLabel = `${count} lane${count === 1 ? "" : "s"}`;
  if (mode === "recent") return `Showing ${laneLabel} by recent movement.`;
  if (mode === "stale") return `Showing ${laneLabel} by oldest touch first.`;
  return `Showing ${laneLabel} by urgency.`;
}

function getRepairOrderSourceId(repairOrder = {}) {
  return String(repairOrder.id || repairOrder.repairOrderId || repairOrder.repairOrderNumber || "");
}

function getSelectedCustomerRepairOrders() {
  return (currentRepairOrders || []).filter((item) => item.customerId === selectedCustomerId);
}

function getActiveRepairOrderRecord() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  return getSelectedCustomerRepairOrders().find((item) => {
    const status = String(item.status || "").toLowerCase();
    const matchesVehicle = !vehicle?.id || !item.vehicleId || item.vehicleId === vehicle.id;
    return matchesVehicle && status !== "closed" && status !== "completed";
  }) || getSelectedCustomerRepairOrders()[0] || null;
}

function getRepairOrderLatestClockEvent(repairOrder) {
  return Array.isArray(repairOrder?.technicianClockEvents) ? repairOrder.technicianClockEvents[0] || null : null;
}

function getRepairOrderMediaAssets(repairOrder = {}) {
  const repairOrderId = repairOrder?.id || repairOrder?.repairOrderId || "";
  return (currentMediaAssets || []).filter((item) => String(item.repairOrderId || "") === String(repairOrderId));
}

function getVinArchiveMediaAssets() {
  const activeRepairOrderId = getActiveRepairOrderRecord()?.id || "";
  return (currentMediaAssets || []).filter((item) => {
    const contextType = String(item.contextType || "").toLowerCase();
    return contextType === "vin_archive" || (contextType !== "repair_order" && String(item.repairOrderId || "") !== String(activeRepairOrderId));
  });
}

function getMediaAssetKind(asset = {}) {
  return String(asset.mediaType || "").toLowerCase().includes("video") ? "video" : "photo";
}

function getRepairOrderStatusTone(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("close") || normalized.includes("complete")) return "good";
  if (normalized.includes("progress") || normalized.includes("open")) return "warn";
  return "info";
}

function getRepairOrderAmounts(repairOrder = {}) {
  const labor = Number(repairOrder.laborSubtotal ?? repairOrder.laborTotal ?? 0);
  const parts = Number(repairOrder.partsSubtotal ?? repairOrder.partsTotal ?? 0);
  const fees = Number(repairOrder.feesSubtotal ?? repairOrder.feesTotal ?? 0);
  const total = Number(repairOrder.totalEstimate ?? repairOrder.totalAmount ?? (labor + parts + fees));
  const balance = Number(repairOrder.balanceDue ?? total);
  const paid = Number(repairOrder.paymentsApplied ?? 0);
  return { labor, parts, fees, total, balance, paid };
}

function getRepairOrderPromisedAt(repairOrder = {}) {
  return repairOrder.promiseAtUtc || repairOrder.promisedAtUtc || repairOrder.promisedTimeUtc || "";
}

function getRepairOrderAdvisorName(repairOrder = {}) {
  return repairOrder.advisor || repairOrder.advisorName || repairOrder.assignedAdvisor || "Rachel Smith";
}

function getRepairOrderPartOrders(repairOrder = {}) {
  const repairOrderId = String(repairOrder?.id || "");
  return (currentPartOrders || []).filter((item) => String(item.repairOrderId || "") === repairOrderId);
}

function getRepairOrderArInvoices(repairOrder = {}) {
  const repairOrderId = String(repairOrder?.id || "");
  return (currentAccountsReceivableInvoices || []).filter((item) => String(item.repairOrderId || "") === repairOrderId);
}

function getRepairOrderApBills(repairOrder = {}) {
  const repairOrderId = String(repairOrder?.id || "");
  return (currentAccountsPayableBills || []).filter((item) => String(item.repairOrderId || "") === repairOrderId);
}

function buildRepairOrderOperationsMarkup(repairOrder = {}) {
  const latestClockEvent = getRepairOrderLatestClockEvent(repairOrder);
  const technicianClockedIn = latestClockEvent?.eventType === "clock_in";
  return `
    <div class="customer360-ro-actions" style="margin-top:14px;">
      <button type="button" class="customer360-toolbar-btn" onclick="addRepairOrderEstimateLine()">Add Estimate</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="addRepairOrderLaborOp()">Dispatch Labor</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="addRepairOrderInspection()">Complete MPI</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="createSpecialPartOrder()">Special Order</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="${technicianClockedIn ? "addTechnicianClockEvent('clock_out')" : "addTechnicianClockEvent('clock_in')"}">${technicianClockedIn ? "Clock Out" : "Clock In"}</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="createAccountsReceivableInvoice()">Post AR</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="createAccountsPayableBill()">Add AP</button>
      <button type="button" class="customer360-toolbar-btn secondary" onclick="captureTechnicianMedia('repair_order','photo')">Add Media</button>
      <button type="button" class="customer360-toolbar-btn" onclick="closeActiveRepairOrder()">Close RO</button>
    </div>
  `;
}

function buildRepairOrderSnapshotMarkup(customer, vehicle, repairOrder = {}) {
  const { labor, parts, fees, total, balance, paid } = getRepairOrderAmounts(repairOrder);
  const latestClockEvent = getRepairOrderLatestClockEvent(repairOrder);
  const customerNumber = customer?.customerNumber || String(customer?.id || "").slice(0, 6).toUpperCase() || "N/A";
  const vehicleTag = vehicle?.licensePlate || vehicle?.tag || (vehicle?.vin ? vehicle.vin.slice(-6) : "N/A");
  const warranty = Number(repairOrder.warrantyPaySubtotal || 0);
  const internal = Number(repairOrder.internalPaySubtotal || 0);
  const customerPay = Number(repairOrder.customerPaySubtotal || 0);
  const paymentType = warranty > 0 ? "Warranty" : internal > 0 ? "Internal" : paid > 0 ? "Posted Payment" : balance > 0 ? "Customer Pay" : "Warranty / Internal";
  const snapshotFields = [
    { label: "Customer No.", value: customerNumber },
    { label: "RO No.", value: repairOrder.repairOrderNumber || "Pending" },
    { label: "Advisor", value: getRepairOrderAdvisorName(repairOrder) },
    { label: "Payment", value: paymentType },
    { label: "VIN", value: vehicle?.vin || "Unknown" },
    { label: "Vehicle", value: vehicleDisplayName(vehicle) },
    { label: "Mileage In", value: repairOrder.odometerIn ?? vehicle?.mileage ?? "-" },
    { label: "Tag", value: vehicleTag },
    { label: "Opened", value: formatDisplayDateTime(repairOrder.openedAtUtc || repairOrder.createdAtUtc) },
    { label: "Promised", value: formatDisplayDateTime(getRepairOrderPromisedAt(repairOrder) || repairOrder.updatedAtUtc || repairOrder.createdAtUtc) },
    { label: "Closed", value: repairOrder.closedAtUtc ? formatDisplayDateTime(repairOrder.closedAtUtc) : "Still open" },
    { label: "Tech Time", value: latestClockEvent ? titleCase(String(latestClockEvent.eventType || "").replaceAll("_", " ")) : "No clock yet" }
  ];

  return `
    <div class="customer360-ro-snapshot">
      <div class="customer360-ro-snapshot-head">
        <strong>Printed RO Snapshot</strong>
        <span>${escapeHtml(titleCase(String(repairOrder.status || "open")))}</span>
      </div>
      <div class="customer360-ro-snapshot-grid">
        ${snapshotFields.map((field) => `
          <div class="customer360-ro-snapshot-field">
            <small>${escapeHtml(field.label)}</small>
            <strong>${escapeHtml(String(field.value ?? "-"))}</strong>
          </div>
        `).join("")}
      </div>
      <div class="customer360-ro-card-complaint"><b>Complaint / Concern:</b> ${escapeHtml(repairOrder.complaint || repairOrder.notes || "Customer concern not written yet.")}</div>
      <div class="customer360-ro-line-summary">
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.estimateLines || []).length, "estimate"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.partLines || []).length, "part line"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.laborOps || []).length, "labor op"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.multiPointInspections || []).length, "MPI item"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.warrantyClaims || []).length, "warranty claim"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.paySplits || []).length, "pay split"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.accountingEntries || []).length, "accounting entry"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel((repairOrder.technicianClockEvents || []).length, "clock event"))}</span>
        <span class="customer360-ro-line-pill">${escapeHtml(formatCountLabel(getRepairOrderMediaAssets(repairOrder).length, "media item"))}</span>
      </div>
      <div class="customer360-ro-kpis">
        <div class="customer360-ro-kpi"><small>Labor</small><strong>${escapeHtml(formatMoney(labor))}</strong></div>
        <div class="customer360-ro-kpi"><small>Parts</small><strong>${escapeHtml(formatMoney(parts))}</strong></div>
        <div class="customer360-ro-kpi"><small>Fees</small><strong>${escapeHtml(formatMoney(fees))}</strong></div>
        <div class="customer360-ro-kpi"><small>Paid</small><strong>${escapeHtml(formatMoney(paid))}</strong></div>
        <div class="customer360-ro-kpi"><small>Cust Pay</small><strong>${escapeHtml(formatMoney(customerPay))}</strong></div>
        <div class="customer360-ro-kpi"><small>Warranty</small><strong>${escapeHtml(formatMoney(warranty))}</strong></div>
        <div class="customer360-ro-kpi"><small>Internal</small><strong>${escapeHtml(formatMoney(internal))}</strong></div>
        <div class="customer360-ro-kpi"><small>Total</small><strong>${escapeHtml(formatMoney(total))}</strong></div>
        <div class="customer360-ro-kpi"><small>Balance</small><strong>${escapeHtml(formatMoney(balance))}</strong></div>
      </div>
      ${buildRepairOrderOperationsMarkup(repairOrder)}
    </div>
  `;
}

function buildRepairOrderDetailSectionsMarkup(repairOrder = {}) {
  const estimateLines = Array.isArray(repairOrder.estimateLines) ? repairOrder.estimateLines : [];
  const partLines = Array.isArray(repairOrder.partLines) ? repairOrder.partLines : [];
  const laborOps = Array.isArray(repairOrder.laborOps) ? repairOrder.laborOps : [];
  const inspections = Array.isArray(repairOrder.multiPointInspections) ? repairOrder.multiPointInspections : [];
  const warrantyClaims = Array.isArray(repairOrder.warrantyClaims) ? repairOrder.warrantyClaims : [];
  const paySplits = Array.isArray(repairOrder.paySplits) ? repairOrder.paySplits : [];
  const clockEvents = Array.isArray(repairOrder.technicianClockEvents) ? repairOrder.technicianClockEvents : [];
  const accountingEntries = Array.isArray(repairOrder.accountingEntries) ? repairOrder.accountingEntries : [];
  const mediaAssets = getRepairOrderMediaAssets(repairOrder);
  const partOrders = getRepairOrderPartOrders(repairOrder);
  const arInvoices = getRepairOrderArInvoices(repairOrder);
  const apBills = getRepairOrderApBills(repairOrder);

  const renderRows = (items, metaBuilder, amountBuilder) => items.length
    ? items.map((item) => {
        const meta = metaBuilder(item);
        return `
          <div class="customer360-ro-detail-row">
            <div>
              <strong>${escapeHtml(meta.title)}</strong>
              <span>${escapeHtml(meta.body)}</span>
            </div>
            <div class="customer360-ro-detail-amount">${escapeHtml(amountBuilder(item))}</div>
          </div>
        `;
      }).join("")
    : `<div class="customer360-empty">No entries yet.</div>`;

  return `
    <div class="customer360-ro-detail-groups">
      <div class="customer360-ro-detail-group">
        <h4>Estimate Lines</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            estimateLines.slice(0, 4),
            (item) => ({
              title: `${item.opCode || item.lineType || "LABOR"} • ${item.description || "Estimate line"}`,
              body: `${titleCase(item.department || "service")} • Qty ${item.quantity ?? 1} • ${titleCase(item.status || "open")}`
            }),
            (item) => formatMoney(item.lineTotal || ((Number(item.quantity || 0) || 1) * Number(item.unitPrice || 0)))
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Parts</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            partLines.slice(0, 4),
            (item) => ({
              title: `${item.partNumber || "PART"} • ${item.description || "Part line"}`,
              body: `${titleCase(item.source || "stock")} • Qty ${item.quantity ?? 1} • ${titleCase(item.status || "requested")}`
            }),
            (item) => formatMoney(item.lineTotal || ((Number(item.quantity || 0) || 1) * Number(item.unitPrice || 0)))
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Labor Ops</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            laborOps.slice(0, 4),
            (item) => ({
              title: `${item.opCode || "OP"} • ${item.description || "Labor op"}`,
              body: `${item.technicianName || "Unassigned"} • ${titleCase(item.dispatchStatus || "queued")} • ${titleCase(item.payType || "customer")}`
            }),
            (item) => `${Number(item.flatRateHours || item.soldHours || 0).toFixed(1)} hr`
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>MPI</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            inspections.slice(0, 4),
            (item) => ({
              title: `${item.category || "General"} • ${item.itemName || "Inspection item"}`,
              body: `${titleCase(item.result || "green")} • ${item.technicianName || "Technician"}`
            }),
            (item) => titleCase(item.severity || "normal")
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Technician Clock</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            clockEvents.slice(0, 4),
            (item) => ({
              title: `${item.technicianName || "Technician"} • ${titleCase(String(item.eventType || "").replaceAll("_", " "))}`,
              body: `${item.laborOpCode || "General op"} • ${formatDisplayDateTime(item.occurredAtUtc || item.createdAtUtc)}`
            }),
            () => "Time"
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Warranty + Pay</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            [...warrantyClaims.slice(0, 2), ...paySplits.slice(0, 2)],
            (item) => ({
              title: item.claimNumber
                ? `${item.claimNumber} • ${item.opCode || "Warranty claim"}`
                : `${titleCase(item.payType || "customer")} • Pay split`,
              body: item.claimNumber
                ? `${titleCase(item.status || "draft")} • ${item.failureCode || "No failure code"}`
                : `${titleCase(item.status || "open")} • ${item.notes || "RO split"}`
            }),
            (item) => formatMoney(item.claimAmount || item.amount || 0)
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Accounting</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            accountingEntries.slice(0, 4),
            (item) => ({
              title: `${titleCase(item.entryType || "entry")} • ${item.description || "Accounting entry"}`,
              body: `${titleCase(item.status || "open")} • ${formatDisplayDateTime(item.updatedAtUtc || item.createdAtUtc)}`
            }),
            (item) => formatMoney(item.amount || 0)
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Special Orders</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            partOrders.slice(0, 4),
            (item) => ({
              title: `${item.partNumber || "ORDER"} • ${titleCase(item.orderType || "special_order")}`,
              body: `${titleCase(item.vendor || "vendor")} • ${titleCase(item.status || "ordered")} • Qty ${item.quantity ?? 1}`
            }),
            (item) => formatDisplayDateTime(item.etaAtUtc || item.updatedAtUtc || item.createdAtUtc)
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Accounts Receivable</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            arInvoices.slice(0, 4),
            (item) => ({
              title: `${item.invoiceNumber || "AR"} • ${titleCase(item.status || "open")}`,
              body: `${item.customerName || "Customer receivable"} • Due ${formatDisplayDateTime(item.dueAtUtc || item.updatedAtUtc || item.createdAtUtc)}`
            }),
            (item) => formatMoney(item.balanceDue || item.amount || 0)
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Accounts Payable</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            apBills.slice(0, 4),
            (item) => ({
              title: `${item.invoiceNumber || "AP"} • ${titleCase(item.status || "open")}`,
              body: `${item.vendorName || "Vendor payable"} • Due ${formatDisplayDateTime(item.dueAtUtc || item.updatedAtUtc || item.createdAtUtc)}`
            }),
            (item) => formatMoney(item.amount || 0)
          )}
        </div>
      </div>
      <div class="customer360-ro-detail-group">
        <h4>Technician Media</h4>
        <div class="customer360-ro-detail-list">
          ${renderRows(
            mediaAssets.slice(0, 4),
            (item) => ({
              title: `${titleCase(getMediaAssetKind(item))} • ${item.fileName || "Media asset"}`,
              body: `${item.caption || "Internal technician evidence"} • ${item.capturedBy || "Technician"}`
            }),
            (item) => formatDisplayDateTime(item.capturedAtUtc || item.createdAtUtc)
          )}
        </div>
      </div>
    </div>
  `;
}

function buildRoleWorkspaceToolsMarkup(customer, vehicle, tasks = [], appointments = [], calls = []) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const latestClockEvent = getRepairOrderLatestClockEvent(activeRepairOrder);
  const technicianClockedIn = latestClockEvent?.eventType === "clock_in";
  const primaryPhone = getSelectedCustomerPrimaryPhone();
  const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const missedCall = calls.find((call) => String(call.status || "").toLowerCase().includes("miss"));
  const nextAppointment = appointments[0] || null;
  const salesTask = openTasks.find((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[sales]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("deal"));
  const bdcTask = openTasks.find((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[bdc]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("callback"));
  const technicianTask = openTasks.find((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[technician]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("inspection"));
  const partsTask = openTasks.find((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[parts]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("parts"));
  const accountingTask = openTasks.find((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[accounting]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("invoice"));
  const fiTask = openTasks.find((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[fi]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("finance"));

  const byLens = {
    home: {
      title: "Core Workspace",
      copy: "Fast access to the main tools that keep the shared customer and vehicle record moving.",
      tools: [
        { label: activeRepairOrder ? "Open Live RO" : "Open Repair Order", detail: activeRepairOrder ? `${activeRepairOrder.repairOrderNumber || "RO"} is active for ${vehicleDisplayName(vehicle)}.` : "Start the advisor write-up and attach all service work to one RO.", action: activeRepairOrder ? "setDepartmentLens('service')" : "openRepairOrderFrom360()", tone: activeRepairOrder ? "warn" : "info" },
        { label: nextAppointment ? "Open Appointment" : "Create Appointment", detail: nextAppointment ? `${nextAppointment.service || "Visit"} is already booked.` : "Book the next visit without leaving the 360.", action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','service')` : "startDepartmentAppointmentCreate()", tone: nextAppointment ? "good" : "info" },
        { label: "Open Inbox", detail: primaryPhone ? `Continue communications with ${formatPhonePretty(primaryPhone)}.` : "Jump into calls and SMS for this customer.", action: primaryPhone ? "openSmsForPhone(getSelectedCustomerPrimaryPhone())" : "setDepartmentLens('bdc')", tone: "info" },
        { label: "VIN Archive", detail: `Work from ${vehicle?.vin || "the VIN"} evidence, media, and health history.`, action: "openVehicleOpsContext('archive')", tone: "good" }
      ]
    },
    service: {
      title: "Advisor Tools",
      copy: "Everything an advisor needs to receive, write up, price, and close the visit from one place.",
      tools: [
        { label: activeRepairOrder ? "RO Is Open" : "Open RO from Visit", detail: activeRepairOrder ? `${activeRepairOrder.repairOrderNumber || "RO"} is the live working file.` : nextAppointment ? "Convert the booked visit into a live repair order." : "Open the first repair order for this visit.", action: activeRepairOrder ? "setDepartmentLens('service')" : "openRepairOrderFrom360()", tone: activeRepairOrder ? "warn" : "info" },
        { label: activeRepairOrder ? "Add Estimate Line" : "Schedule Service", detail: activeRepairOrder ? "Write labor, diagnosis, and approved work into the RO." : "No RO yet, so set or confirm the arrival first.", action: activeRepairOrder ? "addRepairOrderEstimateLine()" : "startDepartmentAppointmentCreate()", tone: "good" },
        { label: activeRepairOrder ? "Warranty Claim" : "Prepare Loaner", detail: activeRepairOrder ? "Start warranty processing and pay-type posture from the advisor lane." : "Transportation and loaner coordination before the write-up.", action: activeRepairOrder ? "addRepairOrderWarrantyClaim()" : "startLoanerTask()", tone: "warn" },
        { label: activeRepairOrder ? "Set Pay Split" : "Add Advisor Note", detail: activeRepairOrder ? "Stage customer, warranty, or internal pay against the live RO." : "Capture concern, approvals, and promised time context.", action: activeRepairOrder ? "addRepairOrderPaySplit('customer')" : "startAdvisorJourneyNote()", tone: activeRepairOrder ? "good" : "info" }
      ]
    },
    bdc: {
      title: "BDC Tools",
      copy: "Keep rescue calls, callbacks, texts, and appointment conversion right in front of the agent.",
      tools: [
        { label: missedCall ? "Rescue Missed Call" : "Open SMS Dock", detail: missedCall ? "Highest-priority missed contact needs immediate recovery." : "Continue the active conversation thread.", action: missedCall ? `openCustomer360FocusedArtifact('calls','${escapeHtml(String(missedCall.id || missedCall.callId || missedCall.createdAtUtc || missedCall.from || ""))}','bdc')` : "openSmsForPhone(getSelectedCustomerPrimaryPhone())", tone: missedCall ? "danger" : "info" },
        { label: bdcTask ? "Open Callback Task" : "Queue Callback", detail: bdcTask ? "A live callback task is already in motion." : "Create the next follow-up task for the BDC queue.", action: bdcTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(bdcTask.id || bdcTask.taskId || bdcTask.createdAtUtc || bdcTask.title || ""))}','bdc')` : "startBdcCallbackTask()", tone: bdcTask ? "warn" : "info" },
        { label: nextAppointment ? "Open Booked Visit" : "Book Appointment", detail: nextAppointment ? "Commitment is captured and ready for handoff." : "Turn conversation into an actual store visit.", action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','bdc')` : "startDepartmentAppointmentCreate()", tone: nextAppointment ? "good" : "warn" },
        { label: "Handoff to Sales", detail: "Move the thread cleanly when the customer is ready for deal work.", action: "setDepartmentLens('sales')", tone: "good" }
      ]
    },
    sales: {
      title: "Sales Tools",
      copy: "Deals, visits, trade steps, and delivery prep should be the first actions a sales user sees.",
      tools: [
        { label: salesTask ? "Open Deal Desk" : "Start Deal Task", detail: salesTask ? "There is already a live sales task on this record." : "Open the opportunity and pricing workflow.", action: salesTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(salesTask.id || salesTask.taskId || salesTask.createdAtUtc || salesTask.title || ""))}','sales')` : "startSalesDealTask()", tone: salesTask ? "warn" : "info" },
        { label: nextAppointment ? "Open Test Drive / Visit" : "Schedule Test Drive", detail: nextAppointment ? "A visit is already booked for this shopper." : "Set the next showroom commitment.", action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','sales')` : "startDepartmentAppointmentCreate()", tone: nextAppointment ? "good" : "info" },
        { label: "Move to F&I", detail: "Advance the customer into finance and delivery prep when the desk is ready.", action: "setDepartmentLens('fi')", tone: "good" },
        { label: "Customer Timeline", detail: "Review full communications and service history before desking the deal.", action: "setCustomer360TimelineFilter('all')", tone: "info" }
      ]
    },
    technicians: {
      title: "Technician Tools",
      copy: "Clocking, findings, parts requests, and inspection documentation should be immediate.",
      tools: [
        { label: activeRepairOrder ? (technicianClockedIn ? "Clock Out of RO" : "Clock In to RO") : "Open RO First", detail: activeRepairOrder ? `${activeRepairOrder.repairOrderNumber || "RO"} is the active job card.` : "A technician should always work against an open RO.", action: activeRepairOrder ? (technicianClockedIn ? "addTechnicianClockEvent('clock_out')" : "addTechnicianClockEvent('clock_in')") : "openRepairOrderFrom360()", tone: activeRepairOrder ? "warn" : "danger" },
        { label: activeRepairOrder ? "Add Labor Op" : technicianTask ? "Open Work Step" : "Log Finding", detail: activeRepairOrder ? "Dispatch flat-rate labor work to the current technician." : technicianTask ? "Inspection or repair work is already live." : "Capture the next diagnostic or inspection result.", action: activeRepairOrder ? "addRepairOrderLaborOp()" : technicianTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(technicianTask.id || technicianTask.taskId || technicianTask.createdAtUtc || technicianTask.title || ""))}','technicians')` : "startTechnicianInspectionNote()", tone: "info" },
        { label: activeRepairOrder ? "Complete MPI" : "Queue Parts Request", detail: activeRepairOrder ? "Record the next multi-point inspection result on the RO." : "Create the next parts handoff.", action: activeRepairOrder ? "addRepairOrderInspection()" : "createTechnicianPartsRequest()", tone: "warn" },
        { label: "Capture Vehicle Evidence", detail: "Add photos or videos to the RO or VIN archive from the bay.", action: "captureTechnicianMedia('repair_order','photo')", tone: "good" }
      ]
    },
    parts: {
      title: "Parts Tools",
      copy: "Parts staff should have pick, source, ETA, and runner actions immediately available.",
      tools: [
        { label: activeRepairOrder ? "Add Parts to RO" : "Create Pick Task", detail: activeRepairOrder ? "Post requested parts to the live RO." : "No active RO, so work from a pick or source task.", action: activeRepairOrder ? "addRepairOrderPartRequest()" : "createPartsPickTask()", tone: activeRepairOrder ? "warn" : "info" },
        { label: activeRepairOrder ? "Place Special Order" : partsTask ? "Open Parts Task" : "Log ETA / Source", detail: activeRepairOrder ? "Create a live OEM or aftermarket special order against the same RO." : partsTask ? "A live parts workflow is already assigned." : "Document source decision, ETA, or special order status.", action: activeRepairOrder ? "createSpecialPartOrder()" : partsTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(partsTask.id || partsTask.taskId || partsTask.createdAtUtc || partsTask.title || ""))}','parts')` : "startPartsEtaNote()", tone: "info" },
        { label: "Runner Dispatch", detail: "Use the same vehicle and technician context to coordinate delivery to the bay.", action: "setDepartmentLens('technicians')", tone: "good" },
        { label: "VIN Archive Reference", detail: "Review service and vehicle evidence before finalizing a part decision.", action: "openVehicleOpsContext('archive')", tone: "info" }
      ]
    },
    accounting: {
      title: "Accounting Tools",
      copy: "Post payments, review invoice posture, and keep the back office attached to the same RO.",
      tools: [
        { label: activeRepairOrder ? "Post AR Invoice" : "Queue Invoice Review", detail: activeRepairOrder ? "Post the customer-facing receivable against the live RO." : "No live RO, so work the invoice queue first.", action: activeRepairOrder ? "createAccountsReceivableInvoice()" : "queueAccountingInvoiceReview()", tone: activeRepairOrder ? "good" : "warn" },
        { label: activeRepairOrder ? "Add AP Bill" : (accountingTask ? "Open Invoice Task" : "Add Ledger Note"), detail: activeRepairOrder ? "Track vendor-side payable tied to the same service job." : accountingTask ? "There is already a live review or collection item." : "Capture statement, reconciliation, or note context.", action: activeRepairOrder ? "createAccountsPayableBill()" : accountingTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(accountingTask.id || accountingTask.taskId || accountingTask.createdAtUtc || accountingTask.title || ""))}','accounting')` : "startLedgerNote()", tone: "info" },
        { label: activeRepairOrder ? "Review RO Balance" : "Open Service Context", detail: activeRepairOrder ? `${formatMoney(getRepairOrderAmounts(activeRepairOrder).balance)} remaining on the RO.` : "Return to the advisor lane to resolve the source visit.", action: activeRepairOrder ? "setDepartmentLens('service')" : "setDepartmentLens('service')", tone: "warn" },
        { label: "Customer Financial File", detail: "Use the unified timeline and notes before closing the back-office loop.", action: "setCustomer360TimelineFilter('activity')", tone: "good" }
      ]
    },
    fi: {
      title: "F&I Tools",
      copy: "Finance users should see funding, products, delivery, and handoff actions first.",
      tools: [
        { label: fiTask ? "Open F&I Work" : "Start F&I Review", detail: fiTask ? "Funding or menu work is already live." : "Open the finance workflow for this deal.", action: fiTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(fiTask.id || fiTask.taskId || fiTask.createdAtUtc || fiTask.title || ""))}','fi')` : "startFiReviewNote()", tone: fiTask ? "warn" : "info" },
        { label: nextAppointment ? "Open Delivery Visit" : "Prep Delivery", detail: nextAppointment ? "A timed handoff is already available." : "Create the delivery handoff anchor.", action: nextAppointment ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','fi')` : "startDeliveryHandoffAppointment()", tone: nextAppointment ? "good" : "info" },
        { label: "Return to Sales", detail: "Jump back to the desk if quoting or approvals still need work.", action: "setDepartmentLens('sales')", tone: "good" },
        { label: "Deal Jacket", detail: "Use the same customer and vehicle record for documents and funding notes.", action: "setCustomer360TimelineFilter('tasks')", tone: "info" }
      ]
    },
    executive: {
      title: "Executive Tools",
      copy: "Leaders need fast drill-in to pressure, ownership, and open work across the record.",
      tools: [
        { label: "Open Manager Queue", detail: "Jump into the highest-pressure department lane from the 360.", action: "setCustomer360ManagerQueueSort('urgent')", tone: "warn" },
        { label: "Review Service Journey", detail: "Track ownership and bottlenecks across service operations.", action: "setDepartmentLens('service')", tone: "info" },
        { label: "Review Revenue Journey", detail: "Drill into BDC, sales, and F&I handoffs.", action: "setDepartmentLens('sales')", tone: "good" },
        { label: "Open VIN Intelligence", detail: "See whether vehicle signals or archive evidence are driving the record.", action: "setCustomer360TimelineFilter('vin')", tone: "info" }
      ]
    },
    settings: {
      title: "Settings Tools",
      copy: "Configuration users need role, access, and workflow-entry actions, not day-to-day store tools.",
      tools: [
        { label: "Department Roles", detail: "Later this will lock each lane down to the right users.", action: "setDepartmentLens('settings')", tone: "info" },
        { label: "Workflow Defaults", detail: "Review appointment, RO, and queue defaults for the store.", action: "setDepartmentLens('settings')", tone: "good" },
        { label: "Communications Setup", detail: "Phone, Twilio, and inbox routing all start from one customer spine.", action: "setDepartmentLens('bdc')", tone: "warn" },
        { label: "Service Ops Setup", detail: "Open the advisor workspace to validate the actual job flow.", action: "setDepartmentLens('service')", tone: "info" }
      ]
    }
  };

  const config = byLens[currentDepartmentLens] || byLens.home;
  return `
    <div class="customer360-role-tools-head">
      <div>
        <h3>${escapeHtml(config.title)}</h3>
        <span>${escapeHtml(config.copy)}</span>
      </div>
      <span class="customer360-status-pill info">${escapeHtml(titleCase(currentDepartmentLens || "home"))}</span>
    </div>
    <div class="customer360-role-tool-grid">
      ${config.tools.map((tool) => `
        <button type="button" class="customer360-role-tool-btn ${escapeHtml(tool.tone || "info")}" onclick="${tool.action}">
          <strong>${escapeHtml(tool.label)}</strong>
          <span>${escapeHtml(tool.detail)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function buildDepartmentDashboardCard({ label = "", value = "", meta = "", tone = "info", action = "", cta = "Open" } = {}) {
  return `
    <button type="button" class="customer360-dashboard-card ${escapeHtml(tone)}" ${action ? `onclick="${action}"` : ""}>
      <div class="customer360-dashboard-label">${escapeHtml(label)}</div>
      <div class="customer360-dashboard-value">${escapeHtml(value)}</div>
      <div class="customer360-dashboard-meta">${escapeHtml(meta)}</div>
      <div class="customer360-dashboard-cta">${escapeHtml(cta)}</div>
    </button>
  `;
}

function buildDepartmentCreateButtonsMarkup(actions = []) {
  if (!actions.length) return "";
  return `
    <div class="customer360-dashboard-createbar">
      ${actions.map(({ label = "", detail = "", action = "" }) => `
        <button type="button" class="customer360-dashboard-createbtn" ${action ? `onclick="${action}"` : ""}>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(detail)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function getDepartmentCreateActions(lens = "home") {
  const createMap = {
    home: [
      { label: "Create Customer", detail: "Add a new customer record to the DMS.", action: "startCreateCustomerRecord()" },
      { label: "Create Vehicle", detail: "Add and link a vehicle to the current customer.", action: "startCreateVehicleRecord()" },
      { label: "Create Appointment", detail: "Book the next visit for the active customer.", action: "startDepartmentAppointmentCreate()" },
      { label: "Create RO", detail: "Open a repair order for the active customer.", action: "startDepartmentRepairOrderCreate()" }
    ],
    service: [
      { label: "Create Appointment", detail: "Book a service visit from the advisor dashboard.", action: "startDepartmentAppointmentCreate()" },
      { label: "Create RO", detail: "Open a live repair order from the service desk.", action: "startDepartmentRepairOrderCreate()" },
      { label: "Create Customer", detail: "Add a new service customer to the DMS.", action: "startCreateCustomerRecord()" },
      { label: "Create Vehicle", detail: "Add a vehicle to the selected customer record.", action: "startCreateVehicleRecord()" }
    ],
    bdc: [
      { label: "Create Customer", detail: "Start a new customer record from the contact queue.", action: "startCreateCustomerRecord()" },
      { label: "Create Appointment", detail: "Book a follow-up visit from BDC.", action: "startDepartmentAppointmentCreate()" },
      { label: "Create Callback Task", detail: "Queue a callback for the right BDC user.", action: "startBdcCallbackTask()" }
    ],
    sales: [
      { label: "Create Customer", detail: "Add a new lead or showroom customer.", action: "startCreateCustomerRecord()" },
      { label: "Create Vehicle", detail: "Attach a trade, interest unit, or delivery vehicle.", action: "startCreateVehicleRecord()" },
      { label: "Create Deal Task", detail: "Open the next sales desk step.", action: "startSalesDealTask()" },
      { label: "Create Visit", detail: "Schedule a showroom or delivery visit.", action: "startDepartmentAppointmentCreate()" }
    ],
    technicians: [
      { label: "Create Labor Op", detail: "Dispatch a new labor operation on the active RO.", action: "startDepartmentLaborOpCreate()" },
      { label: "Create MPI Item", detail: "Add a digital inspection result to the RO.", action: "startDepartmentMpiCreate()" },
      { label: "Create Media", detail: "Capture bay photo or video evidence.", action: "captureTechnicianMedia('repair_order','photo')" }
    ],
    fi: [
      { label: "Create Review Task", detail: "Queue a finance review or delivery prep step.", action: "startFiReviewCreate()" },
      { label: "Create Delivery", detail: "Set the delivery or handoff appointment.", action: "startDeliveryHandoffAppointment()" },
      { label: "Create AR Invoice", detail: "Post the customer receivable when the RO is live.", action: "startAccountingReceivableCreate()" }
    ],
    parts: [
      { label: "Create Part Line", detail: "Add requested parts to the active RO.", action: "startDepartmentPartCreate()" },
      { label: "Create Special Order", detail: "Open an OEM or aftermarket special order.", action: "startDepartmentSpecialOrderCreate()" },
      { label: "Create Parts Task", detail: "Start a pick, source, or ETA workflow.", action: "createPartsPickTask()" }
    ],
    accounting: [
      { label: "Create AR Invoice", detail: "Post the customer receivable for the live job.", action: "startAccountingReceivableCreate()" },
      { label: "Create AP Bill", detail: "Create a vendor payable tied to the job.", action: "startAccountingPayableCreate()" },
      { label: "Create Review Task", detail: "Queue a back-office review for the team.", action: "queueAccountingInvoiceReview()" }
    ]
  };

  return createMap[lens] || createMap.home;
}

async function startCreateCustomerRecord() {
  const firstName = window.prompt("Customer first name", "")?.trim();
  if (firstName === null) return;
  const lastName = window.prompt("Customer last name", "")?.trim();
  if (lastName === null) return;
  const primaryPhone = window.prompt("Primary phone", "")?.trim();
  if (primaryPhone === null) return;
  const email = window.prompt("Email", "")?.trim();
  if (email === null) return;

  try {
    const res = await fetch("/.netlify/functions/customers-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        primaryPhone,
        email,
        preferredLanguage: "English"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create customer");
    selectedCustomerId = data.id || data.customerId || "";
    await loadCustomer360();
    setCustomer360ComposerStatus(`Customer ${customerDisplayName(data)} created.`, "success");
  } catch (err) {
    console.error("startCreateCustomerRecord error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create customer.", "error");
  }
}

async function startCreateVehicleRecord() {
  const customer = getSelectedCustomerRecord();
  if (!customer) {
    setCustomer360ComposerStatus("Select or create a customer before adding a vehicle.", "error");
    return;
  }

  const vin = window.prompt("VIN", "")?.trim();
  if (vin === null) return;
  const yearRaw = window.prompt("Year", "")?.trim();
  if (yearRaw === null) return;
  const make = window.prompt("Make", "")?.trim();
  if (make === null) return;
  const model = window.prompt("Model", "")?.trim();
  if (model === null) return;
  const trim = window.prompt("Trim", "")?.trim();
  if (trim === null) return;
  const mileageRaw = window.prompt("Mileage", "")?.trim();
  if (mileageRaw === null) return;

  try {
    const res = await fetch("/.netlify/functions/vehicles-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        vin,
        year: yearRaw ? Number(yearRaw) : null,
        make,
        model,
        trim,
        mileage: mileageRaw ? Number(mileageRaw) : null
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create vehicle");
    await loadCustomer360();
    setCustomer360ComposerStatus(`Vehicle ${vehicleDisplayName(data)} created.`, "success");
  } catch (err) {
    console.error("startCreateVehicleRecord error:", err);
    setCustomer360ComposerStatus(err.message || "Unable to create vehicle.", "error");
  }
}

function startDepartmentAppointmentCreate() {
  if (!getSelectedCustomerRecord()) {
    setCustomer360ComposerStatus("Select or create a customer before scheduling an appointment.", "error");
    return;
  }
  const defaultService = getDefaultQuickAppointmentService();
  const service = window.prompt("Appointment type", defaultService)?.trim();
  if (service === null) return;
  const date = window.prompt("Appointment date (YYYY-MM-DD)", getNextBusinessDateValue())?.trim();
  if (date === null) return;
  const time = window.prompt("Appointment time (HH:MM)", "10:00")?.trim();
  if (time === null) return;
  const advisor = window.prompt("Advisor", currentDepartmentLens === "sales" ? "Sales Desk" : "Rachel Smith")?.trim();
  if (advisor === null) return;
  const notes = window.prompt("Notes", "")?.trim();
  if (notes === null) return;

  createQuickAppointmentRecord({
    service: service || defaultService,
    advisor: advisor || (currentDepartmentLens === "sales" ? "Sales Desk" : "Rachel Smith"),
    date,
    time,
    transport: currentDepartmentLens === "sales" ? "dropoff" : "",
    notes: notes || `${service || defaultService} created from ${titleCase(currentDepartmentLens)} dashboard.`
  })
    .then(() => setCustomer360ComposerStatus("Appointment created.", "success"))
    .catch((err) => {
      console.error("startDepartmentAppointmentCreate error:", err);
      setCustomer360ComposerStatus(err.message || "Unable to create appointment.", "error");
    });
}

function startDepartmentRepairOrderCreate() {
  if (!getSelectedCustomerRecord()) {
    setCustomer360ComposerStatus("Select or create a customer before opening an RO.", "error");
    return;
  }
  openRepairOrderFrom360();
}

function startDepartmentLaborOpCreate() {
  if (!getActiveRepairOrderRecord()) {
    setCustomer360ComposerStatus("Open an RO before dispatching labor.", "error");
    return;
  }
  addRepairOrderLaborOp();
}

function startDepartmentMpiCreate() {
  if (!getActiveRepairOrderRecord()) {
    setCustomer360ComposerStatus("Open an RO before adding MPI items.", "error");
    return;
  }
  addRepairOrderInspection();
}

function startDepartmentPartCreate() {
  if (!getActiveRepairOrderRecord()) {
    setCustomer360ComposerStatus("Open an RO before adding parts.", "error");
    return;
  }
  addRepairOrderPartRequest();
}

function startDepartmentSpecialOrderCreate() {
  if (!getActiveRepairOrderRecord()) {
    setCustomer360ComposerStatus("Open an RO before placing a special order.", "error");
    return;
  }
  createSpecialPartOrder();
}

function startAccountingReceivableCreate() {
  if (!getActiveRepairOrderRecord()) {
    setCustomer360ComposerStatus("Open an RO before posting AR.", "error");
    return;
  }
  createAccountsReceivableInvoice();
}

function startAccountingPayableCreate() {
  if (!getActiveRepairOrderRecord()) {
    setCustomer360ComposerStatus("Open an RO before adding AP.", "error");
    return;
  }
  createAccountsPayableBill();
}

function startFiReviewCreate() {
  queueAccountingInvoiceReview();
  setCustomer360ComposerStatus("Finance review queued.", "success");
}

function getCustomerById(customerId = "") {
  return (currentCustomers || []).find((item) => String(item.id) === String(customerId)) || null;
}

function getVehicleById(vehicleId = "") {
  return (currentVehicles || []).find((item) => String(item.id) === String(vehicleId)) || null;
}

function getRepairOrdersByCustomer(customerId = "") {
  return (currentRepairOrders || []).filter((item) => String(item.customerId || "") === String(customerId));
}

async function openDepartmentQueueRecord(customerId = "", lens = "home", kind = "", sourceId = "") {
  if (customerId) selectedCustomerId = customerId;
  await refreshSelectedCustomer360();
  if (kind && sourceId) {
    openCustomer360FocusedArtifact(kind, sourceId, lens || currentDepartmentLens);
    return;
  }
  setDepartmentLens(lens || "home");
}

function buildDepartmentQueueSection(title = "", rows = [], emptyCopy = "No queue items.") {
  const sectionKey = `${normalizeDepartmentKey(currentDepartmentLens || "home")}:${String(title || "queue").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const filters = customer360QueueFilters[sectionKey] || { owner: "all", status: "all", preset: "all" };
  const ownerOptions = ["all"].concat([...new Set(rows.map((row) => row?.owner).filter(Boolean))]);
  const statusOptions = ["all"].concat([...new Set(rows.map((row) => row?.status).filter(Boolean))]);
  const preferredOwner = getDepartmentQueuePreferredOwner(sectionKey, ownerOptions);
  const focusStatus = getDepartmentQueueFocusStatus(title, statusOptions);
  const filteredRows = rows.filter((row) => {
    const ownerMatch = filters.owner === "all" || !filters.owner || (row?.owner || "") === filters.owner;
    const statusMatch = filters.status === "all" || !filters.status || (row?.status || "") === filters.status;
    const presetMatch = matchesDepartmentQueuePreset(row, filters.preset, preferredOwner, focusStatus);
    return ownerMatch && statusMatch && presetMatch;
  });
  return `
    <div class="customer360-department-queue" data-queue-section="${escapeHtml(sectionKey)}">
      <div class="customer360-department-queue-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(rows.length ? `${rows.length} live` : "0 live")}</span>
        </div>
        <div class="customer360-department-queue-filters">
          <div class="customer360-department-queue-presets">
            <button type="button" class="customer360-department-queue-preset ${filters.preset === "all" ? "active" : ""}" onclick="setDepartmentQueuePreset('${escapeHtml(sectionKey)}','all','${escapeHtml(preferredOwner || "")}','${escapeHtml(focusStatus || "")}')">All</button>
            <button type="button" class="customer360-department-queue-preset ${filters.preset === "mine" ? "active" : ""}" onclick="setDepartmentQueuePreset('${escapeHtml(sectionKey)}','mine','${escapeHtml(preferredOwner || "")}','${escapeHtml(focusStatus || "")}')">Mine</button>
            <button type="button" class="customer360-department-queue-preset ${filters.preset === "focus" ? "active" : ""}" onclick="setDepartmentQueuePreset('${escapeHtml(sectionKey)}','focus','${escapeHtml(preferredOwner || "")}','${escapeHtml(focusStatus || "")}')">Focus</button>
            <button type="button" class="customer360-department-queue-preset ${filters.preset === "overdue" ? "active" : ""}" onclick="setDepartmentQueuePreset('${escapeHtml(sectionKey)}','overdue','${escapeHtml(preferredOwner || "")}','${escapeHtml(focusStatus || "")}')">Overdue</button>
            <button type="button" class="customer360-department-queue-preset ${filters.preset === "today" ? "active" : ""}" onclick="setDepartmentQueuePreset('${escapeHtml(sectionKey)}','today','${escapeHtml(preferredOwner || "")}','${escapeHtml(focusStatus || "")}')">Due Today</button>
            <button type="button" class="customer360-department-queue-preset ${filters.preset === "unassigned" ? "active" : ""}" onclick="setDepartmentQueuePreset('${escapeHtml(sectionKey)}','unassigned','${escapeHtml(preferredOwner || "")}','${escapeHtml(focusStatus || "")}')">Unassigned</button>
          </div>
          <select onchange="setDepartmentQueueFilter('${escapeHtml(sectionKey)}','owner',this.value)">
            ${ownerOptions.map((option) => `<option value="${escapeHtml(option)}" ${filters.owner === option ? "selected" : ""}>${escapeHtml(option === "all" ? "All owners" : option)}</option>`).join("")}
          </select>
          <select onchange="setDepartmentQueueFilter('${escapeHtml(sectionKey)}','status',this.value)">
            ${statusOptions.map((option) => `<option value="${escapeHtml(option)}" ${filters.status === option ? "selected" : ""}>${escapeHtml(option === "all" ? "All states" : option)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="customer360-department-queue-list">
        ${filteredRows.length ? filteredRows.map((row) => row.html || "").join("") : `<div class="customer360-empty">${escapeHtml(emptyCopy)}</div>`}
      </div>
    </div>
  `;
}

function buildDepartmentQueueRow({
  customer = null,
  vehicle = null,
  title = "",
  meta = "",
  badges = [],
  owner = "",
  status = "",
  priority = "",
  dueAt = "",
  updatedAt = "",
  action = "",
  cta = "Open"
} = {}) {
  return {
    owner: owner || "",
    status: status || String(badges?.[0] || ""),
    priority: priority || "",
    dueAt: dueAt || "",
    updatedAt: updatedAt || "",
    searchText: [title, meta, customerDisplayName(customer), vehicleDisplayName(vehicle), ...(badges || [])].join(" ").toLowerCase(),
    html: `
    <button type="button" class="customer360-department-queue-row" ${action ? `onclick="${action}"` : ""}>
      <div class="customer360-department-queue-main">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(meta)}</span>
        <div class="customer360-department-queue-submeta">
          <span>${escapeHtml(customerDisplayName(customer))}</span>
          <span>${escapeHtml(vehicleDisplayName(vehicle))}</span>
        </div>
      </div>
      <div class="customer360-department-queue-side">
        <div class="customer360-department-queue-badges">
          ${badges.map((badge) => `<span class="customer360-chip">${escapeHtml(badge)}</span>`).join("")}
        </div>
        <span class="customer360-dashboard-cta">${escapeHtml(cta)}</span>
      </div>
    </button>
  `
  };
}

function setDepartmentQueueFilter(sectionKey = "", field = "owner", value = "all") {
  const next = { ...(customer360QueueFilters || {}) };
  next[sectionKey] = { ...(next[sectionKey] || { owner: "all", status: "all", preset: "all" }), [field]: value || "all" };
  saveCustomer360QueueFilters(next);
  renderCustomer360();
}

function isDepartmentQueueDateToday(value = "") {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function matchesDepartmentQueuePreset(row = {}, preset = "all", preferredOwner = "all", focusStatus = "all") {
  if (!preset || preset === "all") return true;
  if (preset === "mine") return preferredOwner && preferredOwner !== "all" ? row.owner === preferredOwner : true;
  if (preset === "focus") return focusStatus && focusStatus !== "all" ? row.status === focusStatus : true;
  if (preset === "overdue") return getJourneyArtifactSla(row.dueAt || row.updatedAt).tone === "danger";
  if (preset === "today") return isDepartmentQueueDateToday(row.dueAt);
  if (preset === "unassigned") {
    const owner = String(row.owner || "").toLowerCase();
    return !owner || owner.includes("queue") || owner.includes("desk");
  }
  return true;
}

function getDepartmentQueuePreferredOwner(sectionKey = "", ownerOptions = []) {
  const lensDepartment = normalizeDepartmentKey(String(sectionKey || "").split(":")[0] || currentDepartmentLens);
  const currentOwner = customer360TaskQueueOwners[lensDepartment];
  if (currentOwner && ownerOptions.includes(currentOwner)) return currentOwner;
  const rosterMatch = getDepartmentRoster(lensDepartment).find((name) => ownerOptions.includes(name));
  if (rosterMatch) return rosterMatch;
  return ownerOptions.find((name) => name && name !== "all" && !String(name).toLowerCase().includes("queue") && !String(name).toLowerCase().includes("desk")) || "all";
}

function getDepartmentQueueFocusStatus(title = "", statusOptions = []) {
  const titleKey = String(title || "").toLowerCase();
  const preferredOrder = [
    "Overdue",
    "Attention",
    "Waiting approval",
    "Needs review",
    "Awaiting dispatch",
    "Ordered",
    "Tomorrow",
    "Scheduled",
    "Open"
  ];
  if (titleKey.includes("approval")) return statusOptions.find((item) => String(item).toLowerCase() === "waiting approval") || statusOptions.find((item) => item !== "all") || "all";
  if (titleKey.includes("transport")) return statusOptions.find((item) => String(item).toLowerCase() === "attention") || statusOptions.find((item) => item !== "all") || "all";
  if (titleKey.includes("special order")) return statusOptions.find((item) => String(item).toLowerCase() === "ordered") || statusOptions.find((item) => item !== "all") || "all";
  if (titleKey.includes("ar") || titleKey.includes("ap") || titleKey.includes("balance")) return statusOptions.find((item) => String(item).toLowerCase() === "open") || statusOptions.find((item) => item !== "all") || "all";
  return preferredOrder.find((candidate) => statusOptions.includes(candidate)) || statusOptions.find((item) => item !== "all") || "all";
}

function setDepartmentQueuePreset(sectionKey = "", preset = "all", owner = "", status = "") {
  const next = { ...(customer360QueueFilters || {}) };
  if (preset === "mine") {
    next[sectionKey] = { owner: owner || "all", status: "all", preset };
  } else if (preset === "focus") {
    next[sectionKey] = { owner: "all", status: status || "all", preset };
  } else if (preset === "overdue" || preset === "today" || preset === "unassigned") {
    next[sectionKey] = { owner: "all", status: "all", preset };
  } else {
    next[sectionKey] = { owner: "all", status: "all", preset: "all" };
  }
  saveCustomer360QueueFilters(next);
  renderCustomer360();
}

function buildDepartmentDashboardMarkup(customer, vehicle, tasks = [], appointments = [], calls = []) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const latestClockEvent = getRepairOrderLatestClockEvent(activeRepairOrder);
  const roAmounts = getRepairOrderAmounts(activeRepairOrder || {});
  const serviceTasks = openTasks.filter((task) => {
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return haystack.includes("[service]") || haystack.includes("advisor") || haystack.includes("loaner") || haystack.includes("transport");
  });
  const bdcTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[bdc]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("callback"));
  const salesTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[sales]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("deal"));
  const technicianTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[technician]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("inspection"));
  const partsTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[parts]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("part"));
  const accountingTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[accounting]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("invoice"));
  const fiTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[fi]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("finance"));
  const missedCalls = calls.filter((call) => String(call.status || "").toLowerCase().includes("miss"));
  const roPartOrders = activeRepairOrder ? getRepairOrderPartOrders(activeRepairOrder) : [];
  const roArInvoices = activeRepairOrder ? getRepairOrderArInvoices(activeRepairOrder) : [];
  const roApBills = activeRepairOrder ? getRepairOrderApBills(activeRepairOrder) : [];
  const roMedia = activeRepairOrder ? getRepairOrderMediaAssets(activeRepairOrder) : [];
  const allOpenTasks = (currentTasks || []).filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const allAppointments = (currentAppointments || []).filter((item) => String(item.status || "").toLowerCase() !== "completed");
  const allRepairOrders = (currentRepairOrders || []).filter((item) => !["closed", "completed"].includes(String(item.status || "").toLowerCase()));
  const allServiceTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "service");
  const allBdcTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "bdc");
  const allSalesTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "sales");
  const allTechnicianTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "technicians");
  const allFiTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "fi");
  const allPartsTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "parts");
  const allAccountingTasks = allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "accounting");
  const allMissedCalls = (currentCalls || []).filter((call) => String(call.status || "").toLowerCase().includes("miss"));
  const totalOpenRoBalance = allRepairOrders.reduce((sum, repairOrder) => sum + Number(getRepairOrderAmounts(repairOrder).balance || 0), 0);
  const totalLaborOps = allRepairOrders.reduce((sum, repairOrder) => sum + (repairOrder.laborOps || []).length, 0);
  const totalMpiItems = allRepairOrders.reduce((sum, repairOrder) => sum + (repairOrder.multiPointInspections || []).length, 0);
  const totalPartLines = allRepairOrders.reduce((sum, repairOrder) => sum + (repairOrder.partLines || []).length, 0);
  const totalSpecialOrders = allRepairOrders.reduce((sum, repairOrder) => sum + getRepairOrderPartOrders(repairOrder).length, 0);
  const totalArInvoices = (currentAccountsReceivableInvoices || []).length;
  const totalApBills = (currentAccountsPayableBills || []).length;
  const totalRoMedia = (currentMediaAssets || []).filter((item) => String(item.contextType || "").toLowerCase() === "repair_order").length;
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const tomorrowAppointments = allAppointments.filter((item) => {
    const raw = item.date ? new Date(`${item.date}T12:00:00`) : new Date(item.startAtUtc || item.createdAtUtc || 0);
    return raw >= tomorrowStart && raw <= tomorrowEnd;
  });
  const upcomingServiceRows = allAppointments
    .slice()
    .sort((a, b) => new Date(a.startAtUtc || `${a.date || ""}T${a.time || "00:00"}` || 0) - new Date(b.startAtUtc || `${b.date || ""}T${b.time || "00:00"}` || 0))
    .slice(0, 8)
    .map((appointment) => {
      const rowCustomer = getCustomerById(appointment.customerId);
      const rowVehicle = getVehicleById(appointment.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: appointment.service || "Service appointment",
        meta: `${formatDisplayDateTime(appointment.startAtUtc || `${appointment.date || ""}T${appointment.time || "00:00"}`)} • ${appointment.advisor || "Advisor queue"}`,
        owner: appointment.advisor || "Advisor queue",
        status: titleCase(appointment.status || "scheduled"),
        dueAt: appointment.startAtUtc || `${appointment.date || ""}T${appointment.time || "00:00"}`,
        updatedAt: appointment.updatedAtUtc || appointment.createdAtUtc || "",
        badges: [titleCase(appointment.status || "scheduled"), appointment.transport || "Standard"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(appointment.customerId || ""))}','service','appointments','${escapeHtml(String(appointment.id || appointment.appointmentId || ""))}')`,
        cta: "Open Visit"
      });
    });
  const tomorrowServiceRows = tomorrowAppointments
    .slice(0, 8)
    .map((appointment) => {
      const rowCustomer = getCustomerById(appointment.customerId);
      const rowVehicle = getVehicleById(appointment.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: appointment.service || "Tomorrow appointment",
        meta: `${appointment.time || "Time pending"} • ${appointment.advisor || "Advisor queue"}`,
        owner: appointment.advisor || "Advisor queue",
        status: "Tomorrow",
        dueAt: appointment.startAtUtc || `${appointment.date || ""}T${appointment.time || "00:00"}`,
        updatedAt: appointment.updatedAtUtc || appointment.createdAtUtc || "",
        badges: ["Tomorrow", appointment.transport || "Standard"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(appointment.customerId || ""))}','service','appointments','${escapeHtml(String(appointment.id || appointment.appointmentId || ""))}')`,
        cta: "Open Tomorrow"
      });
    });
  const openRoRows = allRepairOrders
    .slice()
    .sort((a, b) => new Date(a.updatedAtUtc || a.createdAtUtc || 0) - new Date(b.updatedAtUtc || b.createdAtUtc || 0))
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      const amounts = getRepairOrderAmounts(repairOrder);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • ${repairOrder.complaint || "Repair order"}`,
        meta: `${getRepairOrderAdvisorName(repairOrder)} • Promise ${formatDisplayDateTime(getRepairOrderPromisedAt(repairOrder) || repairOrder.updatedAtUtc || repairOrder.createdAtUtc)}`,
        owner: getRepairOrderAdvisorName(repairOrder),
        status: titleCase(repairOrder.status || "open"),
        dueAt: getRepairOrderPromisedAt(repairOrder) || "",
        updatedAt: repairOrder.updatedAtUtc || repairOrder.createdAtUtc || "",
        badges: [titleCase(repairOrder.status || "open"), formatMoney(amounts.balance || 0)],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','service')`,
        cta: "Open RO"
      });
    });
  const technicianQueueRows = allRepairOrders
    .filter((repairOrder) => (repairOrder.laborOps || []).length || (repairOrder.multiPointInspections || []).length)
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      const latestLabor = getLatestRepairOrderLaborOp(repairOrder);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • ${(repairOrder.laborOps || []).length} labor ops`,
        meta: `${latestLabor?.technicianName || "Tech queue"} • ${latestLabor?.dispatchStatus ? titleCase(latestLabor.dispatchStatus) : "Awaiting dispatch"}`,
        owner: latestLabor?.technicianName || "Tech queue",
        status: latestLabor?.dispatchStatus ? titleCase(latestLabor.dispatchStatus) : "Awaiting dispatch",
        dueAt: getRepairOrderPromisedAt(repairOrder) || "",
        updatedAt: latestLabor?.updatedAtUtc || latestLabor?.createdAtUtc || repairOrder.updatedAtUtc || "",
        badges: [`MPI ${(repairOrder.multiPointInspections || []).length}`, latestLabor?.technicianName || "Queue"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','technicians')`,
        cta: "Open Job"
      });
    });
  const partsQueueRows = allRepairOrders
    .filter((repairOrder) => (repairOrder.partLines || []).length || getRepairOrderPartOrders(repairOrder).length)
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      const specialOrders = getRepairOrderPartOrders(repairOrder);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • ${(repairOrder.partLines || []).length} part lines`,
        meta: `${specialOrders.length} special order${specialOrders.length === 1 ? "" : "s"} • ${formatMoney(getRepairOrderAmounts(repairOrder).parts || 0)} parts`,
        owner: "Parts Queue",
        status: specialOrders[0]?.status ? titleCase(specialOrders[0].status) : "Stock",
        updatedAt: specialOrders[0]?.updatedAtUtc || specialOrders[0]?.createdAtUtc || repairOrder.updatedAtUtc || "",
        badges: [specialOrders[0]?.status ? titleCase(specialOrders[0].status) : "Stock", specialOrders[0]?.partNumber || "RO parts"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','parts')`,
        cta: "Open Parts"
      });
    });
  const accountingQueueRows = allRepairOrders
    .filter((repairOrder) => getRepairOrderAmounts(repairOrder).balance > 0 || (repairOrder.accountingEntries || []).length)
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      const reviewTask = getRepairOrderAccountingReviewTask(repairOrder);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • ${formatMoney(getRepairOrderAmounts(repairOrder).balance || 0)} due`,
        meta: `${reviewTask?.assignedUser || "Accounting queue"} • ${(repairOrder.accountingEntries || []).length} entries posted`,
        owner: reviewTask?.assignedUser || "Accounting queue",
        status: reviewTask ? "Review live" : "Needs review",
        dueAt: getRepairOrderPromisedAt(repairOrder) || "",
        priority: reviewTask?.priority || "high",
        updatedAt: reviewTask?.updatedAtUtc || reviewTask?.createdAtUtc || repairOrder.updatedAtUtc || "",
        badges: [reviewTask ? "Review live" : "Needs review", titleCase(repairOrder.status || "open")],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','accounting')`,
        cta: "Open Review"
      });
    });
  const serviceApprovalRows = allRepairOrders
    .filter((repairOrder) => (repairOrder.estimateLines || []).length && getRepairOrderAmounts(repairOrder).balance > 0)
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • Approval needed`,
        meta: `${(repairOrder.estimateLines || []).length} estimate lines • ${formatMoney(getRepairOrderAmounts(repairOrder).balance)} pending`,
        owner: getRepairOrderAdvisorName(repairOrder),
        status: "Waiting approval",
        dueAt: getRepairOrderPromisedAt(repairOrder) || "",
        updatedAt: repairOrder.updatedAtUtc || repairOrder.createdAtUtc || "",
        badges: [getRepairOrderAdvisorName(repairOrder), getJourneyArtifactSla(getRepairOrderPromisedAt(repairOrder) || repairOrder.updatedAtUtc).label],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','service')`,
        cta: "Open Approval"
      });
    });
  const transportQueueRows = allOpenTasks
    .filter((task) => {
      const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return getTaskAssignedDepartment(task) === "service" && (haystack.includes("loaner") || haystack.includes("transport") || haystack.includes("shuttle"));
    })
    .slice(0, 8)
    .map((task) => {
      const rowCustomer = getCustomerById(task.customerId);
      const rowVehicle = getVehicleById(task.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: task.title || "Transportation task",
        meta: `${task.assignedUser || "Service queue"} • ${task.description || "Transport workflow"}`,
        owner: task.assignedUser || "Service queue",
        status: titleCase(task.priority || "normal"),
        dueAt: task.dueAtUtc || "",
        priority: task.priority || "",
        updatedAt: task.updatedAtUtc || task.createdAtUtc || "",
        badges: [titleCase(task.priority || "normal"), getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).label],
        action: `openDepartmentQueueRecord('${escapeHtml(String(task.customerId || ""))}','service','tasks','${escapeHtml(String(task.id || task.taskId || ""))}')`,
        cta: "Open Transport"
      });
    });
  const technicianWaitingPartsRows = allRepairOrders
    .filter((repairOrder) => {
      const orders = getRepairOrderPartOrders(repairOrder);
      return orders.some((order) => !["delivered", "picked", "complete", "completed"].includes(String(order.status || "").toLowerCase()));
    })
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      const liveOrders = getRepairOrderPartOrders(repairOrder).filter((order) => !["delivered", "picked", "complete", "completed"].includes(String(order.status || "").toLowerCase()));
      const latestLabor = getLatestRepairOrderLaborOp(repairOrder);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • Waiting on parts`,
        meta: `${liveOrders.length} order${liveOrders.length === 1 ? "" : "s"} • ETA ${formatDisplayDateTime(liveOrders[0]?.etaAtUtc || liveOrders[0]?.updatedAtUtc || liveOrders[0]?.createdAtUtc)}`,
        owner: latestLabor?.technicianName || "Tech queue",
        status: liveOrders[0]?.status ? titleCase(liveOrders[0].status) : "Ordered",
        dueAt: liveOrders[0]?.etaAtUtc || getRepairOrderPromisedAt(repairOrder) || "",
        updatedAt: liveOrders[0]?.updatedAtUtc || liveOrders[0]?.createdAtUtc || "",
        badges: [liveOrders[0]?.partNumber || "Parts", liveOrders[0]?.status ? titleCase(liveOrders[0].status) : "Ordered"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','technicians')`,
        cta: "Open Job"
      });
    });
  const technicianApprovalRows = allRepairOrders
    .filter((repairOrder) => (repairOrder.multiPointInspections || []).some((item) => !["green", "pass", "ok"].includes(String(item.result || "").toLowerCase())))
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      const flagged = (repairOrder.multiPointInspections || []).filter((item) => !["green", "pass", "ok"].includes(String(item.result || "").toLowerCase()));
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • Waiting approval`,
        meta: `${flagged.length} MPI item${flagged.length === 1 ? "" : "s"} need advisor decision`,
        owner: flagged[0]?.technicianName || "Tech queue",
        status: "Waiting approval",
        dueAt: getRepairOrderPromisedAt(repairOrder) || "",
        updatedAt: flagged[0]?.updatedAtUtc || flagged[0]?.createdAtUtc || repairOrder.updatedAtUtc || "",
        badges: [flagged[0]?.result ? titleCase(flagged[0].result) : "Flagged", flagged[0]?.technicianName || "Tech"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','technicians')`,
        cta: "Open MPI"
      });
    });
  const specialOrderRows = currentPartOrders
    .filter((order) => String(order.orderType || "").toLowerCase().includes("special"))
    .slice(0, 8)
    .map((order) => {
      const repairOrder = allRepairOrders.find((item) => String(item.id || "") === String(order.repairOrderId || ""));
      const rowCustomer = getCustomerById(repairOrder?.customerId);
      const rowVehicle = getVehicleById(repairOrder?.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${order.partNumber || "Part"} • Special order`,
        meta: `${titleCase(order.vendor || "vendor")} • ETA ${formatDisplayDateTime(order.etaAtUtc || order.updatedAtUtc || order.createdAtUtc)}`,
        owner: "Parts Queue",
        status: titleCase(order.status || "ordered"),
        dueAt: order.etaAtUtc || "",
        updatedAt: order.updatedAtUtc || order.createdAtUtc || "",
        badges: [titleCase(order.status || "ordered"), repairOrder?.repairOrderNumber || "RO"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder?.customerId || ""))}','parts')`,
        cta: "Open Order"
      });
    });
  const arrivalRows = currentPartOrders
    .filter((order) => ["arrived", "picked", "ready", "received"].includes(String(order.status || "").toLowerCase()))
    .slice(0, 8)
    .map((order) => {
      const repairOrder = allRepairOrders.find((item) => String(item.id || "") === String(order.repairOrderId || ""));
      const rowCustomer = getCustomerById(repairOrder?.customerId);
      const rowVehicle = getVehicleById(repairOrder?.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${order.partNumber || "Part"} • Ready to deliver`,
        meta: `${titleCase(order.status || "arrived")} • ${repairOrder?.repairOrderNumber || "RO queue"}`,
        owner: "Parts Queue",
        status: titleCase(order.status || "arrived"),
        dueAt: order.etaAtUtc || "",
        updatedAt: order.updatedAtUtc || order.createdAtUtc || "",
        badges: [titleCase(order.vendor || "vendor"), "Deliver to bay"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder?.customerId || ""))}','parts')`,
        cta: "Open Delivery"
      });
    });
  const accountingBalanceRows = allRepairOrders
    .filter((repairOrder) => getRepairOrderAmounts(repairOrder).balance > 0)
    .slice(0, 8)
    .map((repairOrder) => {
      const rowCustomer = getCustomerById(repairOrder.customerId);
      const rowVehicle = getVehicleById(repairOrder.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${repairOrder.repairOrderNumber || "RO"} • Open balance`,
        meta: `${formatMoney(getRepairOrderAmounts(repairOrder).balance)} due • ${getRepairOrderAdvisorName(repairOrder)}`,
        owner: getRepairOrderAccountingReviewTask(repairOrder)?.assignedUser || "Accounting queue",
        status: titleCase(repairOrder.status || "open"),
        dueAt: getRepairOrderPromisedAt(repairOrder) || "",
        priority: "high",
        updatedAt: repairOrder.updatedAtUtc || repairOrder.createdAtUtc || "",
        badges: [titleCase(repairOrder.status || "open"), getJourneyArtifactSla(getRepairOrderPromisedAt(repairOrder) || repairOrder.updatedAtUtc).label],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder.customerId || ""))}','accounting')`,
        cta: "Open Balance"
      });
    });
  const arDueRows = (currentAccountsReceivableInvoices || [])
    .filter((invoice) => !["paid", "closed", "completed"].includes(String(invoice.status || "").toLowerCase()))
    .slice()
    .sort((a, b) => new Date(a.dueAtUtc || a.updatedAtUtc || a.createdAtUtc || 0) - new Date(b.dueAtUtc || b.updatedAtUtc || b.createdAtUtc || 0))
    .slice(0, 8)
    .map((invoice) => {
      const repairOrder = allRepairOrders.find((item) => String(item.id || "") === String(invoice.repairOrderId || ""));
      const rowCustomer = getCustomerById(invoice.customerId || repairOrder?.customerId);
      const rowVehicle = getVehicleById(repairOrder?.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${invoice.invoiceNumber || "AR invoice"} • Receivable due`,
        meta: `${formatMoney(invoice.balanceDue || invoice.amount || 0)} • Due ${formatDisplayDateTime(invoice.dueAtUtc || invoice.updatedAtUtc || invoice.createdAtUtc)}`,
        owner: "Accounting queue",
        status: titleCase(invoice.status || "open"),
        dueAt: invoice.dueAtUtc || "",
        priority: "high",
        updatedAt: invoice.updatedAtUtc || invoice.createdAtUtc || "",
        badges: [titleCase(invoice.status || "open"), getJourneyArtifactSla(invoice.dueAtUtc || invoice.updatedAtUtc || invoice.createdAtUtc).label],
        action: `openDepartmentQueueRecord('${escapeHtml(String((invoice.customerId || repairOrder?.customerId || "")))}','accounting')`,
        cta: "Open AR"
      });
    });
  const apDueRows = (currentAccountsPayableBills || [])
    .filter((bill) => !["paid", "closed", "completed"].includes(String(bill.status || "").toLowerCase()))
    .slice()
    .sort((a, b) => new Date(a.dueAtUtc || a.updatedAtUtc || a.createdAtUtc || 0) - new Date(b.dueAtUtc || b.updatedAtUtc || b.createdAtUtc || 0))
    .slice(0, 8)
    .map((bill) => {
      const repairOrder = allRepairOrders.find((item) => String(item.id || "") === String(bill.repairOrderId || ""));
      const rowCustomer = getCustomerById(repairOrder?.customerId);
      const rowVehicle = getVehicleById(repairOrder?.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
      return buildDepartmentQueueRow({
        customer: rowCustomer,
        vehicle: rowVehicle,
        title: `${bill.invoiceNumber || "AP bill"} • Vendor due`,
        meta: `${formatMoney(bill.amount || 0)} • Due ${formatDisplayDateTime(bill.dueAtUtc || bill.updatedAtUtc || bill.createdAtUtc)}`,
        owner: "Accounting queue",
        status: titleCase(bill.status || "open"),
        dueAt: bill.dueAtUtc || "",
        priority: "high",
        updatedAt: bill.updatedAtUtc || bill.createdAtUtc || "",
        badges: [titleCase(bill.status || "open"), bill.vendorName || "Vendor"],
        action: `openDepartmentQueueRecord('${escapeHtml(String(repairOrder?.customerId || ""))}','accounting')`,
        cta: "Open AP"
      });
    });

  const homeCards = [
    { label: "Service", value: `${allAppointments.length}`, meta: `${allRepairOrders.length} open ROs across fixed ops`, tone: allAppointments.length ? "warn" : "info", action: "setDepartmentLens('service')", cta: "Open Service Dashboard" },
    { label: "BDC", value: `${allMissedCalls.length}`, meta: `${allBdcTasks.length} callback tasks live`, tone: allMissedCalls.length ? "danger" : allBdcTasks.length ? "warn" : "good", action: "setDepartmentLens('bdc')", cta: "Open BDC Dashboard" },
    { label: "Sales", value: `${allSalesTasks.length}`, meta: `${allAppointments.length ? `${allAppointments.length} visits booked` : "No showroom visit yet"}`, tone: allSalesTasks.length ? "warn" : "info", action: "setDepartmentLens('sales')", cta: "Open Sales Dashboard" },
    { label: "Technicians", value: `${totalLaborOps}`, meta: `${allTechnicianTasks.length} technician tasks live`, tone: totalLaborOps ? "warn" : "info", action: "setDepartmentLens('technicians')", cta: "Open Technician Dashboard" },
    { label: "F&I", value: `${allFiTasks.length}`, meta: `${allSalesTasks.length ? "Deal handoffs active" : "No deal in finance yet"}`, tone: allFiTasks.length ? "warn" : "good", action: "setDepartmentLens('fi')", cta: "Open F&I Dashboard" },
    { label: "Parts", value: `${totalSpecialOrders || allPartsTasks.length}`, meta: `${totalPartLines} part lines across open ROs`, tone: totalSpecialOrders || allPartsTasks.length ? "warn" : "good", action: "setDepartmentLens('parts')", cta: "Open Parts Dashboard" },
    { label: "Accounting", value: `${totalArInvoices + totalApBills}`, meta: `${formatMoney(totalOpenRoBalance)} open across all live ROs`, tone: totalArInvoices || totalApBills || totalOpenRoBalance ? "warn" : "good", action: "setDepartmentLens('accounting')", cta: "Open Accounting Dashboard" }
  ];

  const byLens = {
    home: {
      title: "Department Dashboards",
      copy: "Open each department’s dashboard directly from here.",
      cards: homeCards
    },
    service: {
      title: "Service Dashboard",
      copy: "Advisor tools and live fixed-ops state across the store.",
      cards: [
        { label: "Open ROs", value: `${allRepairOrders.length}`, meta: openRoRows[0] ? "Every open repair order is available below." : "No open repair order yet", tone: allRepairOrders.length ? "warn" : "info", action: "setDepartmentLens('service')", cta: "View Open ROs" },
        { label: "Appointments", value: `${allAppointments.length}`, meta: upcomingServiceRows[0] ? "Storewide advisor appointment queue." : "No service visit booked", tone: allAppointments.length ? "good" : "warn", action: "setDepartmentLens('service')", cta: "View Appointments" },
        { label: "Tomorrow", value: `${tomorrowAppointments.length}`, meta: tomorrowServiceRows[0] ? "Tomorrow's drive opens are below." : "No appointments booked for tomorrow", tone: tomorrowAppointments.length ? "info" : "good", action: "setDepartmentLens('service')", cta: "View Tomorrow" },
        { label: "Open Balance", value: formatMoney(totalOpenRoBalance || 0), meta: `${totalArInvoices} AR invoice(s) and ${totalApBills} AP bill(s) linked`, tone: totalOpenRoBalance > 0 ? "warn" : "good", action: "setDepartmentLens('accounting')", cta: "Open Accounting" }
      ]
    },
    bdc: {
      title: "BDC Dashboard",
      copy: "Communication queue, callbacks, and appointment conversion.",
      cards: [
        { label: "Missed Calls", value: `${allMissedCalls.length}`, meta: allMissedCalls[0]?.from || "No missed calls right now", tone: allMissedCalls.length ? "danger" : "good", action: "setDepartmentLens('bdc')", cta: allMissedCalls.length ? "Rescue Queue" : "Open Queue" },
        { label: "Callbacks", value: `${allBdcTasks.length}`, meta: allBdcTasks[0]?.title || "No callback tasks live", tone: allBdcTasks.length ? "warn" : "good", action: "setDepartmentLens('bdc')", cta: allBdcTasks.length ? "Open Callbacks" : "Queue Callback" },
        { label: "Texts", value: `${(currentCalls || []).length}`, meta: "Storewide phone and SMS traffic queue", tone: (currentCalls || []).length ? "info" : "good", action: "setDepartmentLens('bdc')", cta: "Open Messaging" },
        { label: "Appointments", value: `${allAppointments.length}`, meta: upcomingServiceRows[0] ? "Appointments are ready for confirmation." : "No booked visit", tone: allAppointments.length ? "good" : "warn", action: "setDepartmentLens('bdc')", cta: allAppointments.length ? "Open Appointments" : "Book Visit" }
      ]
    },
    sales: {
      title: "Sales Dashboard",
      copy: "Deal desk, showroom, and handoff actions for the sales team.",
      cards: [
        { label: "Open Deals", value: `${allSalesTasks.length}`, meta: allSalesTasks[0]?.title || "No active deal task yet", tone: allSalesTasks.length ? "warn" : "good", action: "setDepartmentLens('sales')", cta: allSalesTasks.length ? "Open Deals" : "Start Deal" },
        { label: "Showroom Visits", value: `${allAppointments.length}`, meta: upcomingServiceRows[0] ? "Upcoming visit queue is live." : "No test drive scheduled", tone: allAppointments.length ? "good" : "warn", action: "setDepartmentLens('sales')", cta: allAppointments.length ? "Open Visits" : "Schedule Visit" },
        { label: "Customer Context", value: `${(currentCalls || []).length + (currentTasks || []).length}`, meta: "Communications and workflow remain clickable", tone: "info", action: "setDepartmentLens('sales')", cta: "Open Activity" },
        { label: "F&I Handoff", value: `${allFiTasks.length}`, meta: allFiTasks[0]?.title || "No finance handoff yet", tone: allFiTasks.length ? "warn" : "good", action: "setDepartmentLens('fi')", cta: allFiTasks.length ? "Open F&I" : "Hand Off" }
      ]
    },
    technicians: {
      title: "Technician Dashboard",
      copy: "Clocking, labor dispatch, MPI, and media capture in one place.",
      cards: [
        { label: "Active Jobs", value: `${technicianQueueRows.length}`, meta: technicianQueueRows[0] ? "Storewide technician queue is live below." : "No active repair order", tone: technicianQueueRows.length ? "warn" : "good", action: "setDepartmentLens('technicians')", cta: technicianQueueRows.length ? "Open Jobs" : "Open Queue" },
        { label: "Labor Ops", value: `${totalLaborOps}`, meta: totalLaborOps ? "Labor dispatch is active across open ROs." : "No labor ops dispatched yet", tone: totalLaborOps ? "warn" : "good", action: "setDepartmentLens('technicians')", cta: "Open Labor Ops" },
        { label: "MPI Items", value: `${totalMpiItems}`, meta: totalMpiItems ? "MPI work is active across the store." : "No MPI results on open ROs", tone: totalMpiItems ? "info" : "good", action: "setDepartmentLens('technicians')", cta: "Open MPI" },
        { label: "Media", value: `${totalRoMedia}`, meta: totalRoMedia ? "Technician media has been captured on live jobs." : "No technician photos or videos yet", tone: totalRoMedia ? "good" : "info", action: "setDepartmentLens('technicians')", cta: totalRoMedia ? "Open Media Queue" : "Capture Media" }
      ]
    },
    fi: {
      title: "F&I Dashboard",
      copy: "Finance review, delivery prep, and funding posture.",
      cards: [
        { label: "Finance Tasks", value: `${allFiTasks.length}`, meta: allFiTasks[0]?.title || "No F&I work active", tone: allFiTasks.length ? "warn" : "good", action: "setDepartmentLens('fi')", cta: allFiTasks.length ? "Open F&I" : "Start Review" },
        { label: "Delivery", value: `${allAppointments.length}`, meta: allAppointments.length ? "Upcoming delivery / visit records are live." : "No delivery appointment set", tone: allAppointments.length ? "good" : "info", action: "setDepartmentLens('fi')", cta: allAppointments.length ? "Open Delivery" : "Prep Delivery" },
        { label: "Sales Handoff", value: `${allSalesTasks.length}`, meta: allSalesTasks[0]?.title || "No sales handoff waiting", tone: allSalesTasks.length ? "info" : "good", action: "setDepartmentLens('sales')", cta: "Open Sales" },
        { label: "Accounting Sync", value: `${totalArInvoices + totalApBills}`, meta: "Finance and accounting stay linked to the same job", tone: totalArInvoices + totalApBills ? "warn" : "good", action: "setDepartmentLens('accounting')", cta: "Open Accounting" }
      ]
    },
    parts: {
      title: "Parts Dashboard",
      copy: "Inventory demand, special orders, sourcing, and dispatch.",
      cards: [
        { label: "Part Lines", value: `${totalPartLines}`, meta: partsQueueRows[0] ? "Part demand is active on live ROs." : "No parts attached to the RO", tone: totalPartLines ? "warn" : "good", action: "setDepartmentLens('parts')", cta: totalPartLines ? "Open Part Lines" : "Create Pick" },
        { label: "Special Orders", value: `${totalSpecialOrders}`, meta: totalSpecialOrders ? "OEM / aftermarket ordering is active." : "No special orders live", tone: totalSpecialOrders ? "warn" : "good", action: "setDepartmentLens('parts')", cta: totalSpecialOrders ? "Open Orders" : "Open Parts" },
        { label: "Open Requests", value: `${allPartsTasks.length}`, meta: allPartsTasks[0]?.title || "No parts requests waiting", tone: allPartsTasks.length ? "info" : "good", action: "setDepartmentLens('parts')", cta: allPartsTasks.length ? "Open Requests" : "Create Request" },
        { label: "VIN Evidence", value: `${getVinArchiveMediaAssets().length}`, meta: "Use archive evidence before sourcing decisions", tone: "info", action: "setDepartmentLens('parts')", cta: "Open VIN Archive" }
      ]
    },
    accounting: {
      title: "Accounting Dashboard",
      copy: "AR, AP, balances, and posting queue for the live job.",
      cards: [
        { label: "AR Invoices", value: `${totalArInvoices}`, meta: currentAccountsReceivableInvoices[0]?.invoiceNumber || "No AR invoices posted", tone: totalArInvoices ? "warn" : "good", action: "setDepartmentLens('accounting')", cta: totalArInvoices ? "Open AR" : "Open Accounting" },
        { label: "AP Bills", value: `${totalApBills}`, meta: currentAccountsPayableBills[0]?.invoiceNumber || "No AP bills posted", tone: totalApBills ? "warn" : "good", action: "setDepartmentLens('accounting')", cta: totalApBills ? "Open AP" : "Open Accounting" },
        { label: "RO Balance", value: formatMoney(totalOpenRoBalance || 0), meta: allRepairOrders.length ? `${allRepairOrders.length} open repair orders` : "No active repair order", tone: totalOpenRoBalance > 0 ? "warn" : "good", action: "setDepartmentLens('service')", cta: allRepairOrders.length ? "Open Service" : "Queue Review" },
        { label: "Reviews", value: `${allAccountingTasks.length}`, meta: allAccountingTasks[0]?.title || "No accounting tasks live", tone: allAccountingTasks.length ? "info" : "good", action: "setDepartmentLens('accounting')", cta: allAccountingTasks.length ? "Open Reviews" : "Queue Review" }
      ]
    }
  };

  const queueByLens = {
    home: [
      buildDepartmentQueueSection("Upcoming Appointments", upcomingServiceRows, "No live appointments across the store."),
      buildDepartmentQueueSection("Open Repair Orders", openRoRows, "No open repair orders across the store.")
    ],
    service: [
      buildDepartmentQueueSection("All Upcoming Appointments", upcomingServiceRows, "No service appointments scheduled."),
      buildDepartmentQueueSection("Tomorrow's Appointments", tomorrowServiceRows, "No appointments booked for tomorrow."),
      buildDepartmentQueueSection("All Open Repair Orders", openRoRows, "No open repair orders in fixed ops."),
      buildDepartmentQueueSection("Waiting Approval", serviceApprovalRows, "No repair orders are waiting on estimate approval."),
      buildDepartmentQueueSection("Transport / Loaner Queue", transportQueueRows, "No transport or loaner work is active.")
    ],
    technicians: [
      buildDepartmentQueueSection("Active Technician Jobs", technicianQueueRows, "No technician jobs are active."),
      buildDepartmentQueueSection("Waiting on Parts", technicianWaitingPartsRows, "No technician jobs are blocked by parts."),
      buildDepartmentQueueSection("Waiting for Advisor Approval", technicianApprovalRows, "No MPI items are waiting on advisor approval.")
    ],
    parts: [
      buildDepartmentQueueSection("Open Parts Work", partsQueueRows, "No parts work is open right now."),
      buildDepartmentQueueSection("Special Orders In Flight", specialOrderRows, "No special orders are in flight."),
      buildDepartmentQueueSection("Arrivals / Ready To Deliver", arrivalRows, "No parts are marked as arrived or ready.")
    ],
    accounting: [
      buildDepartmentQueueSection("Open Accounting Reviews", accountingQueueRows, "No accounting reviews are pending."),
      buildDepartmentQueueSection("Open RO Balances", accountingBalanceRows, "No repair orders have an open balance."),
      buildDepartmentQueueSection("AR Due", arDueRows, "No AR invoices are currently due."),
      buildDepartmentQueueSection("AP Due", apDueRows, "No AP bills are currently due.")
    ],
    bdc: [
      buildDepartmentQueueSection("Upcoming Appointments", upcomingServiceRows, "No booked appointments to confirm."),
      buildDepartmentQueueSection("Open Follow-Ups", allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "bdc").slice(0, 8).map((task) => {
        const rowCustomer = getCustomerById(task.customerId);
        const rowVehicle = getVehicleById(task.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
        return buildDepartmentQueueRow({
          customer: rowCustomer,
          vehicle: rowVehicle,
          title: task.title || "BDC follow-up",
          meta: `${task.assignedUser || "BDC queue"} • ${task.description || "Follow-up task"}`,
          owner: task.assignedUser || "BDC queue",
          status: titleCase(task.status || "open"),
          dueAt: task.dueAtUtc || "",
          priority: task.priority || "",
          updatedAt: task.updatedAtUtc || task.createdAtUtc || "",
          badges: [titleCase(task.priority || "normal"), titleCase(task.status || "open")],
          action: `openDepartmentQueueRecord('${escapeHtml(String(task.customerId || ""))}','bdc','tasks','${escapeHtml(String(task.id || task.taskId || ""))}')`,
          cta: "Open Task"
        });
      }), "No BDC follow-ups are open.")
    ],
    sales: [
      buildDepartmentQueueSection("Open Sales Tasks", allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "sales").slice(0, 8).map((task) => {
        const rowCustomer = getCustomerById(task.customerId);
        const rowVehicle = getVehicleById(task.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
        return buildDepartmentQueueRow({
          customer: rowCustomer,
          vehicle: rowVehicle,
          title: task.title || "Sales task",
          meta: `${task.assignedUser || "Sales queue"} • ${task.description || "Deal workflow"}`,
          owner: task.assignedUser || "Sales queue",
          status: titleCase(task.status || "open"),
          dueAt: task.dueAtUtc || "",
          priority: task.priority || "",
          updatedAt: task.updatedAtUtc || task.createdAtUtc || "",
          badges: [titleCase(task.priority || "normal"), titleCase(task.status || "open")],
          action: `openDepartmentQueueRecord('${escapeHtml(String(task.customerId || ""))}','sales','tasks','${escapeHtml(String(task.id || task.taskId || ""))}')`,
          cta: "Open Deal"
        });
      }), "No sales tasks are open."),
      buildDepartmentQueueSection("Upcoming Appointments", upcomingServiceRows, "No showroom or service visits are booked.")
    ],
    fi: [
      buildDepartmentQueueSection("Open F&I Tasks", allOpenTasks.filter((task) => getTaskAssignedDepartment(task) === "fi").slice(0, 8).map((task) => {
        const rowCustomer = getCustomerById(task.customerId);
        const rowVehicle = getVehicleById(task.vehicleId) || getCustomerPrimaryVehicle(rowCustomer);
        return buildDepartmentQueueRow({
          customer: rowCustomer,
          vehicle: rowVehicle,
          title: task.title || "F&I task",
          meta: `${task.assignedUser || "F&I queue"} • ${task.description || "Finance workflow"}`,
          owner: task.assignedUser || "F&I queue",
          status: titleCase(task.status || "open"),
          dueAt: task.dueAtUtc || "",
          priority: task.priority || "",
          updatedAt: task.updatedAtUtc || task.createdAtUtc || "",
          badges: [titleCase(task.priority || "normal"), titleCase(task.status || "open")],
          action: `openDepartmentQueueRecord('${escapeHtml(String(task.customerId || ""))}','fi','tasks','${escapeHtml(String(task.id || task.taskId || ""))}')`,
          cta: "Open Review"
        });
      }), "No F&I work is open."),
      buildDepartmentQueueSection("Upcoming Deliveries / Visits", upcomingServiceRows, "No upcoming delivery or visit records are booked.")
    ]
  };

  const config = byLens[currentDepartmentLens] || byLens.home;
  const createActions = getDepartmentCreateActions(currentDepartmentLens);
  return `
    <div class="customer360-dashboard-head">
      <div>
        <h3>${escapeHtml(config.title)}</h3>
        <span>${escapeHtml(config.copy)}</span>
      </div>
      <span class="customer360-status-pill info">${escapeHtml(getDepartmentLensConfig().name)}</span>
    </div>
    ${buildDepartmentCreateButtonsMarkup(createActions)}
    <div class="customer360-dashboard-grid">
      ${config.cards.map((card) => buildDepartmentDashboardCard(card)).join("")}
    </div>
    <div class="customer360-department-queue-grid">
      ${(queueByLens[currentDepartmentLens] || queueByLens.home).join("")}
    </div>
  `;
}

function buildRepairOrderBoardMarkup(repairOrders = []) {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const nextAppointment = (currentAppointments || []).find((item) => item.customerId === selectedCustomerId && String(item.status || "").toLowerCase() !== "completed") || null;
  if (!repairOrders.length) {
    return `
      <div class="customer360-ro-board-head">
        <div>
          <h3>Live Repair Orders</h3>
          <span>No repair order is open for this customer yet. Advisors should be able to start the visit from here in one click.</span>
        </div>
      </div>
      <div class="customer360-ro-empty">
        No active RO yet. Open the first repair order to start write-up, estimates, parts, technician time, and accounting against the same record.
      </div>
      <div class="customer360-ro-actions">
        <button type="button" class="customer360-toolbar-btn" onclick="openRepairOrderFrom360()">${nextAppointment ? "Open RO from Appointment" : "Open Repair Order"}</button>
        <button type="button" class="customer360-toolbar-btn secondary" onclick="startDepartmentAppointmentCreate()">Schedule Appointment</button>
      </div>
    `;
  }

  const sortedRepairOrders = repairOrders.slice().sort((left, right) => {
    const leftOpen = ["closed", "completed"].includes(String(left.status || "").toLowerCase()) ? 0 : 1;
    const rightOpen = ["closed", "completed"].includes(String(right.status || "").toLowerCase()) ? 0 : 1;
    if (leftOpen !== rightOpen) return rightOpen - leftOpen;
    return new Date(right.updatedAtUtc || right.createdAtUtc || 0).getTime() - new Date(left.updatedAtUtc || left.createdAtUtc || 0).getTime();
  });

  const openCount = sortedRepairOrders.filter((item) => !["closed", "completed"].includes(String(item.status || "").toLowerCase())).length;

  return `
    <div class="customer360-ro-board-head">
      <div>
        <h3>Live Repair Orders</h3>
        <span>${openCount ? `${openCount} live ${openCount === 1 ? "RO" : "ROs"} for the advisor desk.` : "Recent RO history for this customer and vehicle."}</span>
      </div>
      <div class="customer360-ro-actions" style="grid-template-columns:repeat(2,max-content);">
        <button type="button" class="customer360-toolbar-btn" onclick="openRepairOrderFrom360()">Open Repair Order</button>
        <button type="button" class="customer360-toolbar-btn secondary" onclick="setDepartmentLens('service')">Open Advisor Lens</button>
      </div>
    </div>
    <div class="customer360-ro-board-grid">
      ${sortedRepairOrders.map((repairOrder) => {
        const sourceId = escapeHtml(getRepairOrderSourceId(repairOrder));
        const latestClockEvent = getRepairOrderLatestClockEvent(repairOrder);
        const closed = ["closed", "completed"].includes(String(repairOrder.status || "").toLowerCase());
        const { labor, parts, fees, total, balance } = getRepairOrderAmounts(repairOrder);
        return `
          <div class="customer360-ro-card">
            <div class="customer360-ro-card-top">
              <div>
                <strong>${escapeHtml(repairOrder.repairOrderNumber || "RO-lite")}</strong>
                <span>${escapeHtml(vehicleDisplayName(vehicle))}</span>
              </div>
              <span class="customer360-status-pill ${getRepairOrderStatusTone(repairOrder.status)}">${escapeHtml(titleCase(repairOrder.status || "open"))}</span>
            </div>
            <div class="customer360-ro-card-complaint">${escapeHtml(repairOrder.complaint || "Complaint not written yet.")}</div>
            ${buildRepairOrderSnapshotMarkup(customer, vehicle, repairOrder)}
            ${buildRepairOrderDetailSectionsMarkup(repairOrder)}
            <div class="customer360-ro-kpis">
              <div class="customer360-ro-kpi">
                <small>Advisor</small>
                <strong>${escapeHtml(getRepairOrderAdvisorName(repairOrder))}</strong>
              </div>
              <div class="customer360-ro-kpi">
                <small>Promised</small>
                <strong>${escapeHtml(formatDisplayDateTime(getRepairOrderPromisedAt(repairOrder) || repairOrder.updatedAtUtc || repairOrder.createdAtUtc))}</strong>
              </div>
              <div class="customer360-ro-kpi">
                <small>Total</small>
                <strong>${escapeHtml(formatMoney(total))}</strong>
              </div>
              <div class="customer360-ro-kpi">
                <small>Balance</small>
                <strong>${escapeHtml(formatMoney(balance))}</strong>
              </div>
              <div class="customer360-ro-kpi">
                <small>Tech Clock</small>
                <strong>${escapeHtml(latestClockEvent ? titleCase(String(latestClockEvent.eventType || "").replaceAll("_", " ")) : "No time yet")}</strong>
              </div>
              <div class="customer360-ro-kpi">
                <small>Write-Up</small>
                <strong>${escapeHtml(`${formatMoney(labor)} labor • ${formatMoney(parts)} parts • ${formatMoney(fees)} fees`)}</strong>
              </div>
            </div>
            <div class="customer360-ro-actions">
              <button type="button" class="customer360-toolbar-btn" onclick="setDepartmentLens('service')">${closed ? "View RO" : "Advisor View"}</button>
              <button type="button" class="customer360-toolbar-btn secondary" onclick="${closed ? "openRepairOrderFrom360()" : "addRepairOrderEstimateLine()"}">${closed ? "Reopen Flow" : "Add Estimate"}</button>
              <button type="button" class="customer360-toolbar-btn secondary" onclick="${closed ? `openCustomer360FocusedArtifact('tasks','${sourceId}','service')` : "addRepairOrderPartRequest()"}">${closed ? "Open Activity" : "Add Part"}</button>
              <button type="button" class="customer360-toolbar-btn secondary" onclick="${closed ? "addAccountingRepairOrderEntry()" : (latestClockEvent?.eventType === "clock_in" ? `addTechnicianClockEvent('clock_out')` : `addTechnicianClockEvent('clock_in')`)}">${closed ? "Post Payment" : (latestClockEvent?.eventType === "clock_in" ? "Clock Out" : "Clock In")}</button>
              <button type="button" class="customer360-toolbar-btn secondary" onclick="addAccountingRepairOrderEntry()">Post Accounting</button>
              <button type="button" class="customer360-toolbar-btn ${closed ? "secondary" : ""}" onclick="${closed ? "openRepairOrderFrom360()" : "closeActiveRepairOrder()"}">${closed ? "Open New RO" : "Close RO"}</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function loadRepairOrders(customerId = selectedCustomerId, vehicleId = getSelectedVehicleRecord()?.id || "") {
  try {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    if (vehicleId) params.set("vehicleId", vehicleId);
    const res = await fetch(`/.netlify/functions/service-repair-orders-list?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load repair orders");
    currentRepairOrders = Array.isArray(data.repairOrders) ? data.repairOrders : [];
  } catch (err) {
    console.error("loadRepairOrders error:", err);
    currentRepairOrders = [];
  }
}

async function loadMediaAssets(customerId = selectedCustomerId, vehicleId = getSelectedVehicleRecord()?.id || "", repairOrderId = "") {
  try {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (repairOrderId) params.set("repairOrderId", repairOrderId);
    const res = await fetch(`/.netlify/functions/media-assets-list?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load media assets");
    currentMediaAssets = Array.isArray(data.media) ? data.media : [];
  } catch (err) {
    console.error("loadMediaAssets error:", err);
    currentMediaAssets = [];
  }
}

async function loadPartOrders(repairOrderId = "") {
  try {
    const params = new URLSearchParams();
    if (repairOrderId) params.set("repairOrderId", repairOrderId);
    const res = await fetch(`/.netlify/functions/parts-orders-list?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load part orders");
    currentPartOrders = Array.isArray(data.orders) ? data.orders : [];
  } catch (err) {
    console.error("loadPartOrders error:", err);
    currentPartOrders = [];
  }
}

async function loadAccountsPayableBills() {
  try {
    const res = await fetch("/.netlify/functions/accounting-ap-bills-list");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load AP bills");
    currentAccountsPayableBills = Array.isArray(data.bills) ? data.bills : [];
  } catch (err) {
    console.error("loadAccountsPayableBills error:", err);
    currentAccountsPayableBills = [];
  }
}

async function loadAccountsReceivableInvoices(repairOrderId = "") {
  try {
    const params = new URLSearchParams();
    if (repairOrderId) params.set("repairOrderId", repairOrderId);
    const res = await fetch(`/.netlify/functions/accounting-ar-invoices-list?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load AR invoices");
    currentAccountsReceivableInvoices = Array.isArray(data.invoices) ? data.invoices : [];
  } catch (err) {
    console.error("loadAccountsReceivableInvoices error:", err);
    currentAccountsReceivableInvoices = [];
  }
}

function buildManagerQueueCard({ key = "", label = "", headline = "", copy = "", tone = "info", countLabel = "", ownerLabel = "", action = "", focused = false, priorityReason = "", freshness = "" } = {}) {
  const ownerAge = [ownerLabel || "", freshness || ""].filter(Boolean).join(" • ");
  return `
    <button type="button" class="customer360-manager-card ${focused ? "focused" : ""}" ${action ? `onclick="${action}"` : ""}>
      <div class="customer360-manager-card-top">
        <div>
          <h4>${escapeHtml(label || "Lane")}</h4>
          <p>${escapeHtml(headline || "No active queue")}</p>
        </div>
        <span class="customer360-manager-pill ${escapeHtml(tone || "info")}">${escapeHtml(key || "lane")}</span>
      </div>
      <p>${escapeHtml(copy || "Queue detail will appear here.")}</p>
      ${priorityReason ? `<span class="customer360-manager-reason">Why top: ${escapeHtml(priorityReason)}</span>` : ""}
      ${ownerAge ? `<span class="customer360-manager-ownerage ${escapeHtml(tone || "info")}">${escapeHtml(ownerAge)}</span>` : ""}
      <div class="customer360-manager-meta">
        <span class="customer360-manager-pill ${escapeHtml(tone || "info")}">${escapeHtml(countLabel || "0 open")}</span>
        ${freshness && !ownerLabel ? `<span class="customer360-manager-freshness">${escapeHtml(freshness)}</span>` : ""}
      </div>
    </button>
  `;
}

async function setJourneyAssignee(stageKey = "", owner = "") {
  if (!stageKey || !selectedCustomerId) return;
  const previousOwner = customer360AssigneeMap[getJourneyAssigneeKey(stageKey)] || "";
  const nextMap = { ...customer360AssigneeMap, [getJourneyAssigneeKey(stageKey)]: owner || getJourneyStageOwner(stageKey, "active") };
  saveJourneyAssigneeMap(nextMap);
  renderCustomer360Detail();

  try {
    await persistJourneyAssignee(stageKey, owner || getJourneyStageOwner(stageKey, "active"));
    await refreshSelectedCustomer360();
    renderCustomer360Detail();
    setCustomer360ComposerStatus(`${titleCase(stageKey)} assigned to ${owner || "default owner"}.`, "success");
  } catch (err) {
    const rollbackMap = { ...customer360AssigneeMap, [getJourneyAssigneeKey(stageKey)]: previousOwner };
    if (!previousOwner) {
      delete rollbackMap[getJourneyAssigneeKey(stageKey)];
    }
    saveJourneyAssigneeMap(rollbackMap);
    renderCustomer360Detail();
    setCustomer360ComposerStatus(err.message || "Unable to save assignee.", "error");
  }
}

function buildLaneOwnerMarkup(stageKey = "", status = "active") {
  const assignment = getTimelineJourneyAssignment(stageKey);
  const owner = getJourneyAssignedOwner(stageKey, status);
  const changedAt = assignment?.occurredAtUtc || assignment?.createdAtUtc || "";
  return `
    <div class="customer360-service-owner">
      <div>
        <strong>${escapeHtml(owner)}</strong>
        <span>${escapeHtml(changedAt ? `Latest change ${formatDisplayDateTime(changedAt)}` : "No reassignment yet")}</span>
      </div>
      <span class="customer360-status-pill info">${escapeHtml(titleCase(stageKey))}</span>
    </div>
  `;
}

function getJourneyArtifactMovedAtLabel(value) {
  if (!value) return "Awaiting update";
  try {
    return `Moved ${formatDisplayDateTime(value)}`;
  } catch {
    return "Moved recently";
  }
}

function getJourneyArtifactSla(value) {
  if (!value) {
    return { label: "Waiting", tone: "warn" };
  }

  const movedAt = new Date(value);
  if (Number.isNaN(movedAt.getTime())) {
    return { label: "Active", tone: "good" };
  }

  const ageHours = (Date.now() - movedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours >= 24) return { label: "Overdue", tone: "danger" };
  if (ageHours >= 8) return { label: "Attention", tone: "warn" };
  return { label: "On Track", tone: "good" };
}

function getRecentJourneyAssignments(limit = 3) {
  const stageKeys = getActiveJourneyStageKeys();
  return (currentCustomerTimeline || [])
    .filter((event) => String(event.eventType || "").toLowerCase() === "journey_assignment" && stageKeys.includes(String(event.department || "").toLowerCase()))
    .slice(0, limit);
}

function getLatestJourneyArtifact(stageKey = "", tasks = [], notes = [], appointments = []) {
  const taskMatchesStage = (task, key) => {
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    if (key === "bdc") return haystack.includes("[bdc]") || haystack.includes("lead") || haystack.includes("callback");
    if (key === "sales") return haystack.includes("[sales]") || haystack.includes("deal") || haystack.includes("quote") || haystack.includes("trade");
    if (key === "fi") return haystack.includes("[fi]") || haystack.includes("finance") || haystack.includes("funding") || haystack.includes("warranty");
    if (key === "delivery") return haystack.includes("[delivery]") || haystack.includes("delivery") || haystack.includes("pickup");
    if (key === "technicians") return haystack.includes("[technician]");
    if (key === "parts") return haystack.includes("[parts]");
    if (key === "accounting") return haystack.includes("[accounting]");
    return false;
  };

  if (stageKey === "service") {
    const loanerTask = tasks.find((item) => {
      const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
      return haystack.includes("loaner") || haystack.includes("transport");
    });
    const appointment = appointments[0];
    if (appointment) {
      return {
        label: "Latest booking",
        detail: `${appointment.service || "Service visit"} • ${appointment.date || "TBD"} ${appointment.time || ""}`.trim(),
        interactive: true,
        kind: "appointments",
        sourceId: appointment.id || `${appointment.date || ""}-${appointment.time || ""}`,
        owner: "Advisor",
        movedAt: appointment.updatedAtUtc || appointment.createdAtUtc || appointment.date,
        slaAt: appointment.updatedAtUtc || appointment.createdAtUtc || appointment.date
      };
    }
    if (loanerTask) {
      return {
        label: "Loaner coordination",
        detail: `${String(loanerTask.title || "Loaner / transport workflow").replace(/\[service\]\s*/i, "").trim()}`,
        interactive: true,
        kind: "tasks",
        sourceId: loanerTask.id || loanerTask.taskId || loanerTask.createdAtUtc || loanerTask.title,
        owner: "Advisor",
        movedAt: loanerTask.updatedAtUtc || loanerTask.createdAtUtc || loanerTask.dueAtUtc,
        slaAt: loanerTask.dueAtUtc || loanerTask.updatedAtUtc || loanerTask.createdAtUtc
      };
    }
    const note = notes.find((item) => String(item.body || "").toLowerCase().includes("[service]"));
    if (note) {
      return {
        label: "Advisor note",
        detail: String(note.body || "").replace(/\[service\]\s*/i, "").slice(0, 72),
        interactive: true,
        kind: "notes",
        sourceId: note.id || note.noteId || note.createdAtUtc || note.body,
        owner: "Advisor",
        movedAt: note.updatedAtUtc || note.createdAtUtc,
        slaAt: note.updatedAtUtc || note.createdAtUtc
      };
    }

    const vehicleSignal = getLatestTaggedArtifact("[vehicle]", notes, currentCustomerTimeline || []);
    if (vehicleSignal) {
      return {
        label: "Vehicle health signal",
        detail: String(vehicleSignal.body || "").replace(/\[vehicle\]\s*/i, "").trim().slice(0, 72),
        interactive: true,
        kind: "notes",
        sourceId: vehicleSignal.id || vehicleSignal.noteId || vehicleSignal.timelineEventId || vehicleSignal.createdAtUtc || vehicleSignal.body,
        owner: "Advisor",
        movedAt: vehicleSignal.updatedAtUtc || vehicleSignal.occurredAtUtc || vehicleSignal.createdAtUtc,
        slaAt: vehicleSignal.updatedAtUtc || vehicleSignal.occurredAtUtc || vehicleSignal.createdAtUtc
      };
    }

    const archiveSignal = getLatestTaggedArtifact("[archive]", notes, currentCustomerTimeline || []);
    if (archiveSignal) {
      return {
        label: "VIN evidence",
        detail: String(archiveSignal.body || "").replace(/\[archive\]\s*/i, "").trim().slice(0, 72),
        interactive: true,
        kind: "notes",
        sourceId: archiveSignal.id || archiveSignal.noteId || archiveSignal.timelineEventId || archiveSignal.createdAtUtc || archiveSignal.body,
        owner: "Advisor",
        movedAt: archiveSignal.updatedAtUtc || archiveSignal.occurredAtUtc || archiveSignal.createdAtUtc,
        slaAt: archiveSignal.updatedAtUtc || archiveSignal.occurredAtUtc || archiveSignal.createdAtUtc
      };
    }
  }

  const stageTasks = tasks.filter((item) => taskMatchesStage(item, stageKey));
  const preferredOpenTask = stageTasks.find((item) => String(item.status || "").toLowerCase() !== "completed");
  const latestStageTask = preferredOpenTask || stageTasks[0];

  if (latestStageTask) {
    const isAutoCreated = String(latestStageTask.description || "").toLowerCase().includes("auto-created");
    return {
      label: isAutoCreated ? "Auto handoff task" : "Latest task",
      detail: `${String(latestStageTask.title || "").replace(/\[(bdc|sales|fi|delivery|technician|parts|accounting)\]/ig, "").trim() || "Tagged task"}`,
      interactive: true,
      kind: "tasks",
      sourceId: latestStageTask.id || latestStageTask.taskId || latestStageTask.createdAtUtc || latestStageTask.title,
      owner: getJourneyAssignedOwner(stageKey, "active"),
      movedAt: latestStageTask.updatedAtUtc || latestStageTask.createdAtUtc || latestStageTask.dueAtUtc,
      slaAt: latestStageTask.dueAtUtc || latestStageTask.updatedAtUtc || latestStageTask.createdAtUtc
    };
  }

  const tag = stageKey === "technicians"
    ? "[technician]"
    : stageKey === "bdc"
      ? "[bdc]"
      : stageKey === "sales"
        ? "[sales]"
        : stageKey === "fi"
          ? "[fi]"
          : stageKey === "delivery"
            ? "[delivery]"
    : stageKey === "parts"
      ? "[parts]"
      : stageKey === "accounting"
        ? "[accounting]"
        : "";

  if (tag) {
    const note = notes.find((item) => String(item.body || "").toLowerCase().includes(tag));
    if (note) {
      return {
        label: "Latest note",
        detail: `${String(note.body || "").replace(new RegExp(tag, "i"), "").trim().slice(0, 72)}`,
        interactive: true,
        kind: "notes",
        sourceId: note.id || note.noteId || note.createdAtUtc || note.body,
        owner: getJourneyAssignedOwner(stageKey, "active"),
        movedAt: note.updatedAtUtc || note.createdAtUtc,
        slaAt: note.updatedAtUtc || note.createdAtUtc
      };
    }
  }

  return {
    label: "Latest artifact",
    detail: "No linked artifact yet",
    interactive: false,
    kind: "all",
    sourceId: "",
    owner: getJourneyAssignedOwner(stageKey, "upcoming"),
    movedAt: "",
    slaAt: ""
  };
}

function openJourneyArtifact(stageKey = "service") {
  const validStage = ["service", "technicians", "parts", "accounting", "bdc", "sales", "fi", "delivery"].includes(stageKey) ? stageKey : "service";
  const artifact = currentJourneyArtifacts[validStage] || null;
  setDepartmentLens(getJourneyStageLens(validStage));
  const mode = artifact?.kind === "appointments"
    ? "appointment"
    : artifact?.kind === "notes"
      ? "note"
      : artifact?.kind === "tasks"
        ? "task"
        : validStage === "service"
          ? "appointment"
          : validStage === "accounting" || validStage === "fi"
            ? "note"
            : "task";
  currentCustomer360Focus = artifact?.sourceId ? { kind: artifact.kind, sourceId: artifact.sourceId } : null;
  if (artifact?.kind) {
    currentCustomer360TimelineFilter = normalizeCustomer360TimelineFilter(artifact.kind);
    document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
      item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
    });
  }
  setCustomer360ComposerMode(mode);
  renderCustomer360Timeline();
  document.getElementById("customer360ComposerBody")?.focus();
}

function openCustomer360FocusedArtifact(kind = "notes", sourceId = "", lens = currentDepartmentLens) {
  if (kind === "media") {
    if (sourceId) window.open(String(sourceId), "_blank");
    return;
  }

  const normalizedKind = normalizeCustomer360TimelineFilter(kind);
  const id = String(sourceId || "");
  if (!id) return;

  if (lens) setDepartmentLens(lens);
  currentCustomer360Focus = { kind: normalizedKind, sourceId: id };
  currentCustomer360TimelineFilter = normalizedKind;
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
    item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
  });

  if (normalizedKind === "appointments") {
    setCustomer360ComposerMode("appointment");
  } else if (normalizedKind === "tasks") {
    setCustomer360ComposerMode("task");
  } else {
    setCustomer360ComposerMode("note");
  }

  renderCustomer360Timeline();
}

function openVehicleOpsContext(mode = "signals") {
  const tasks = (currentTasks || []).filter((task) => task.customerId === selectedCustomerId);
  const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const latestVehicleArtifact = getLatestTaggedArtifact("[vehicle]", currentCustomerNotes, currentCustomerTimeline || []);
  const latestArchiveArtifact = getLatestTaggedArtifact("[archive]", currentCustomerNotes, currentCustomerTimeline || []);
  const archiveFollowUpTask = openTasks.find((task) => {
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return haystack.includes("[archive]") || haystack.includes("archive");
  });

  if (mode === "signals" && latestVehicleArtifact) {
    openCustomer360FocusedArtifact(
      "notes",
      latestVehicleArtifact.id || latestVehicleArtifact.noteId || latestVehicleArtifact.timelineEventId || latestVehicleArtifact.createdAtUtc || latestVehicleArtifact.body,
      "home"
    );
    preloadFocusedVehicleServiceFollowUp({
      body: String(latestVehicleArtifact.body || "").replace(/\[vehicle\]\s*/i, "").trim()
    });
    setCustomer360ComposerStatus("Vehicle signal opened with a service follow-up ready.", "success");
    return;
  }

  if (mode === "archive" && latestArchiveArtifact) {
    openCustomer360FocusedArtifact(
      "notes",
      latestArchiveArtifact.id || latestArchiveArtifact.noteId || latestArchiveArtifact.timelineEventId || latestArchiveArtifact.createdAtUtc || latestArchiveArtifact.body,
      "home"
    );
    preloadFocusedArchiveAction({
      body: String(latestArchiveArtifact.body || "").replace(/\[archive\]\s*/i, "").trim()
    }, "task");
    setCustomer360ComposerStatus("VIN archive evidence opened with a linked task ready.", "success");
    return;
  }

  if (mode === "evidence-tasks" && archiveFollowUpTask) {
    openCustomer360FocusedArtifact(
      "tasks",
      archiveFollowUpTask.id || archiveFollowUpTask.taskId || archiveFollowUpTask.createdAtUtc || archiveFollowUpTask.title,
      "service"
    );
    setDepartmentLens("service");
    setCustomer360ComposerMode("task");
    setCustomer360ComposerStatus("Evidence task opened and ready for the next service action.", "success");
    return;
  }

  currentCustomer360TimelineFilter = mode === "evidence-tasks" ? "tasks" : "notes";
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
    item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
  });
  currentCustomer360Focus = null;
  if (mode === "evidence-tasks") {
    setDepartmentLens("service");
    setCustomer360ComposerMode("task");
  } else {
    setDepartmentLens("home");
    setCustomer360ComposerMode("note");
  }
  renderCustomer360Timeline();
}

function openVehicleRailAction(mode = "loaner") {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer || !vehicle) return;

  if (mode === "loaner") {
    setDepartmentLens("service");
    startLoanerTask();
    setCustomer360ComposerStatus("Loaner workflow opened from the vehicle rail.", "success");
    return;
  }

  if (mode === "geo") {
    setDepartmentLens("service");
    startVehicleGeoMovementNote();
    setCustomer360ComposerStatus("Geo / movement workflow opened from the vehicle rail.", "success");
    return;
  }
}

function triggerJourneyFeedback(stageKey = "", message = "") {
  currentJourneyFeedbackStage = stageKey;
  currentJourneyFeedbackMessage = message;
  if (currentJourneyFeedbackTimer) clearTimeout(currentJourneyFeedbackTimer);
  renderCustomer360Journey(
    (currentTasks || []).filter((task) => task.customerId === selectedCustomerId),
    currentCustomerNotes,
    (currentAppointments || []).filter((item) => item.customerId === selectedCustomerId)
  );
  currentJourneyFeedbackTimer = setTimeout(() => {
    currentJourneyFeedbackStage = "";
    currentJourneyFeedbackMessage = "";
    renderCustomer360Journey(
      (currentTasks || []).filter((task) => task.customerId === selectedCustomerId),
      currentCustomerNotes,
      (currentAppointments || []).filter((item) => item.customerId === selectedCustomerId)
    );
  }, 2200);
}

function getJourneyStageLabel(stage, isFeedback = false) {
  if (isFeedback) return "Updated";
  if (stage.status === "complete") return "Done";
  if (stage.status === "active") return "Live";
  return "Queued";
}

function getJourneyStageSubcopy(stage, isFeedback = false) {
  if (isFeedback) return "Updated just now";
  if (stage.status === "complete") return "Ready for handoff";
  if (stage.status === "active") return "Current owner";
  return "Waiting on prior step";
}

function getActiveJourneyStageKeys() {
  if (["sales", "bdc", "fi"].includes(currentDepartmentLens)) {
    return ["bdc", "sales", "fi", "delivery"];
  }
  return ["service", "technicians", "parts", "accounting"];
}

function getJourneyNextAction(stageKey = "") {
  if (stageKey === "bdc") {
    return {
      eyebrow: "Next Best Action",
      title: "Queue the callback task",
      detail: "Reconnect the lead and lock the next appointment or handoff.",
      label: "Queue Callback",
      run: () => {
        setDepartmentLens("bdc");
        startBdcCallbackTask();
      }
    };
  }

  if (stageKey === "sales") {
    return {
      eyebrow: "Next Best Action",
      title: "Open the deal task",
      detail: "Advance quote, trade, or test-drive work from the same customer record.",
      label: "Open Deal Task",
      run: () => {
        setDepartmentLens("sales");
        startSalesDealTask();
      }
    };
  }

  if (stageKey === "fi") {
    return {
      eyebrow: "Next Best Action",
      title: "Prepare the finance package",
      detail: "Capture warranty, funding, and delivery-readiness notes before handoff.",
      label: "Open F&I Note",
      run: () => {
        setDepartmentLens("fi");
        startFiReviewNote();
      }
    };
  }

  if (stageKey === "delivery") {
    return {
      eyebrow: "Next Best Action",
      title: "Finalize delivery checklist",
      detail: "Turn the closed deal into a delivery-ready customer handoff.",
      label: "Schedule Delivery",
      run: () => {
        setDepartmentLens("sales");
        startDeliveryHandoffAppointment();
      }
    };
  }

  if (stageKey === "service") {
    const serviceArtifact = currentJourneyArtifacts.service || null;
    if (serviceArtifact?.label === "Loaner coordination") {
      return {
        eyebrow: "Next Best Action",
        title: "Confirm transportation plan",
        detail: "Keep the advisor-owned loaner or shuttle workflow moving before the visit expands.",
        label: "Open Loaner Task",
        run: () => {
          setDepartmentLens("service");
          startLoanerTask();
        }
      };
    }

    if (serviceArtifact?.label === "Vehicle health signal") {
      return {
        eyebrow: "Next Best Action",
        title: "Review the vehicle health signal",
        detail: "Turn the battery, mileage, recall, or maintenance signal into an advisor-owned service follow-up.",
        label: "Create Service Follow-Up",
        run: () => {
          setDepartmentLens("service");
          runFocusedVehicleArtifactAction("service-followup", serviceArtifact.sourceId || "");
        }
      };
    }

    if (serviceArtifact?.label === "VIN evidence") {
      return {
        eyebrow: "Next Best Action",
        title: "Work the VIN evidence",
        detail: "Convert the newest archive evidence into a linked task or advisor note before lane write-up.",
        label: "Open Archive Follow-Up",
        run: () => {
          setDepartmentLens("service");
          openCustomer360FocusedArtifact("notes", serviceArtifact.sourceId || "", "home");
          runFocusedVehicleArtifactAction("archive-task", serviceArtifact.sourceId || "");
        }
      };
    }

    return {
      eyebrow: "Next Best Action",
      title: "Finish the advisor write-up",
      detail: "Confirm the concern, promised time, and transportation before sending the visit into the lane.",
      label: "Open Write-Up",
      run: () => {
        setDepartmentLens("service");
        startServiceWriteUp();
      }
    };
  }

  if (stageKey === "technicians") {
    return {
      eyebrow: "Next Best Action",
      title: "Log technician findings",
      detail: "Capture the inspection result and recommended repair so the downstream handoff stays attached to the same record.",
      label: "Log Finding",
      run: () => {
        setDepartmentLens("technicians");
        startTechnicianInspectionNote();
      }
    };
  }

  if (stageKey === "parts") {
    return {
      eyebrow: "Next Best Action",
      title: "Create the parts request",
      detail: "Open the stock pull or sourcing task and route it to counter, bay, or runner.",
      label: "Create Parts Request",
      run: () => {
        setDepartmentLens("parts");
        createPartsPickTask();
      }
    };
  }

  return {
    eyebrow: "Next Best Action",
    title: "Queue invoice review",
    detail: "Move the service outcome into statement, payment, and reconciliation posture.",
    label: "Open Invoice Review",
    run: () => {
      setDepartmentLens("accounting");
      queueAccountingInvoiceReview();
    }
  };
}

function runJourneyNextAction(stageKey = "") {
  const action = getJourneyNextAction(stageKey);
  action?.run?.();
}

function preloadFocusedTaskFollowUp(item) {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: item?.subcopy?.replace(/^Follow Up:\s*/i, "").trim() || `${vehicleDisplayName(vehicle)} next step`,
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nFollow-up from focused artifact:\n${item?.body || ""}\n\nNext action:\n- `,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Follow-up task loaded from focused artifact."
  });
}

function preloadFocusedVehicleServiceFollowUp(item) {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  setDepartmentLens("service");
  presetCustomer360Composer("task", {
    title: `[SERVICE] ${vehicleDisplayName(vehicle)} vehicle follow-up`,
    body: `[SERVICE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nCreated from vehicle health event:\n${item?.body || ""}\n\nNext service action:\n- Advisor review:\n- Lane / diagnostic step:\n- Customer communication:`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Service follow-up loaded from vehicle health event."
  });
}

function preloadFocusedArchiveAction(item, mode = "task") {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (mode === "note") {
    presetCustomer360Composer("note", {
      body: `[ARCHIVE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nArchive follow-up:\n${item?.body || ""}\n\nNext documentation step:\n- Additional file or media needed:\n- Linked department:\n- Notes:`,
      status: "Archive note loaded from VIN artifact."
    });
    return;
  }

  presetCustomer360Composer("task", {
    title: `[ARCHIVE] ${vehicleDisplayName(vehicle)} follow-up`,
    body: `[ARCHIVE] ${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nFollow-up task from VIN archive entry:\n${item?.body || ""}\n\nNext action:\n- Owner:\n- Department handoff:\n- File / evidence needed:`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Archive task loaded from VIN artifact."
  });
}

function runFocusedVehicleArtifactAction(action = "followup", sourceId = "") {
  const id = String(sourceId || "");
  if (!id) return;
  const item = currentCustomer360TimelineCards.find((entry) => String(entry.sourceId || "") === id);
  if (!item) return;

  if (action === "service-followup") {
    preloadFocusedVehicleServiceFollowUp(item);
    triggerJourneyFeedback("service", "Vehicle health event moved into service follow-up.");
    return;
  }

  if (action === "archive-task") {
    preloadFocusedArchiveAction(item, "task");
    triggerJourneyFeedback(currentDepartmentLens, "Archive task loaded from VIN evidence.");
    return;
  }

  if (action === "archive-note") {
    preloadFocusedArchiveAction(item, "note");
    triggerJourneyFeedback(currentDepartmentLens, "Archive note loaded from VIN evidence.");
  }
}

async function advanceFocusedJourneyItem(kind = "tasks", sourceId = "") {
  const normalizedKind = normalizeCustomer360TimelineFilter(kind);
  const id = String(sourceId || "");
  if (!id) return;

  if (normalizedKind === "tasks") {
    await completeTask(id);
    triggerJourneyFeedback(currentDepartmentLens, "Focused task completed and journey updated.");
    return;
  }

  if (normalizedKind === "appointments") {
    setDepartmentLens("technicians");
    setCustomer360ComposerStatus("Technician flow opened from the focused appointment.", "success");
    triggerJourneyFeedback("technicians", "Appointment advanced into technician flow.");
    return;
  }

  if (normalizedKind === "notes") {
    const item = currentCustomer360TimelineCards.find((entry) =>
      normalizeCustomer360TimelineFilter(categorizeCustomer360TimelineItem(entry)) === normalizedKind &&
      String(entry.sourceId || "") === id
    );
    preloadFocusedTaskFollowUp(item);
    triggerJourneyFeedback(currentDepartmentLens, "Follow-up task loaded from the focused note.");
    return;
  }
}

function buildFocusedTimelineAdvanceActions(item) {
  if (!currentCustomer360Focus) return "";
  const isFocused = currentCustomer360Focus.kind === categorizeCustomer360TimelineItem(item) && String(currentCustomer360Focus.sourceId) === String(item.sourceId || "");
  if (!isFocused) return "";

  const kind = normalizeCustomer360TimelineFilter(categorizeCustomer360TimelineItem(item));
  if (kind === "tasks") {
    return `
      <div class="customer360-timeline-actions">
        <button type="button" class="customer360-mini-btn" onclick="advanceFocusedJourneyItem('tasks','${escapeHtml(String(item.sourceId || ""))}')">Complete Task</button>
      </div>
    `;
  }

  if (kind === "appointments") {
    return `
      <div class="customer360-timeline-actions">
        <button type="button" class="customer360-mini-btn" onclick="advanceFocusedJourneyItem('appointments','${escapeHtml(String(item.sourceId || ""))}')">Start Technician Flow</button>
      </div>
    `;
  }

  if (kind === "notes") {
    if (item.type === "Vehicle Health") {
      return `
        <div class="customer360-timeline-actions">
          <button type="button" class="customer360-mini-btn" onclick="runFocusedVehicleArtifactAction('service-followup','${escapeHtml(String(item.sourceId || ""))}')">Create Service Follow-Up</button>
        </div>
      `;
    }

    if (item.type === "VIN Archive") {
      return `
        <div class="customer360-timeline-actions">
          <button type="button" class="customer360-mini-btn" onclick="runFocusedVehicleArtifactAction('archive-task','${escapeHtml(String(item.sourceId || ""))}')">Create Linked Task</button>
          <button type="button" class="customer360-mini-btn" onclick="runFocusedVehicleArtifactAction('archive-note','${escapeHtml(String(item.sourceId || ""))}')">Add Archive Note</button>
        </div>
      `;
    }

    return `
      <div class="customer360-timeline-actions">
        <button type="button" class="customer360-mini-btn" onclick="advanceFocusedJourneyItem('notes','${escapeHtml(String(item.sourceId || ""))}')">Create Follow-Up Task</button>
      </div>
    `;
  }

  return "";
}

function getJourneyDefinition(tasks = [], notes = [], appointments = [], calls = []) {
  const hasBdc = calls.length > 0 || hasKeywordMatch(tasks, ["lead", "callback", "bdc", "quote"]) || hasKeywordMatch(notes, ["lead", "callback", "bdc"]);
  const hasSales = hasKeywordMatch(tasks, ["deal", "quote", "test drive", "trade"]) || hasKeywordMatch(notes, ["quote", "trade", "sales"]);
  const hasFi = hasKeywordMatch(tasks, ["[fi]", "funding", "warranty", "finance"]) || hasKeywordMatch(notes, ["[fi]", "funding", "menu", "finance"]);
  const hasDelivery = hasKeywordMatch(tasks, ["delivery", "handoff", "vehicle pickup"]) || hasKeywordMatch(notes, ["delivery", "picked up"]);

  const hasServiceNote = hasKeywordMatch(notes, ["[service]"]);
  const hasVehicleSignal = hasKeywordMatch(notes, ["[vehicle]"]);
  const hasArchiveSignal = hasKeywordMatch(notes, ["[archive]"]);
  const hasLoanerSignal = hasKeywordMatch(tasks, ["loaner", "transport", "shuttle"]) || hasKeywordMatch(notes, ["loaner", "transport", "shuttle"]);
  const hasGeoSignal = hasKeywordMatch(notes, ["geo / movement update", "current zone", "next destination", "dispatch or lane note"]);
  const serviceReady = appointments.length > 0 || hasServiceNote || hasVehicleSignal || hasArchiveSignal || hasLoanerSignal || hasGeoSignal;
  const techReady = hasKeywordMatch(tasks, ["[technician]", "diagn", "inspect", "tech", "repair"]) || hasKeywordMatch(notes, ["[technician]", "inspection", "finding", "diagn"]);
  const partsReady = hasKeywordMatch(tasks, ["[parts]", "part", "stock", "sku", "runner"]) || hasKeywordMatch(notes, ["[parts]", "eta", "part", "stock", "runner"]);
  const accountingReady = hasKeywordMatch(tasks, ["[accounting]", "invoice", "payment", "statement", "ledger"]) || hasKeywordMatch(notes, ["[accounting]", "statement", "ledger", "payment", "refund"]);

  if (["sales", "bdc", "fi"].includes(currentDepartmentLens)) {
    return {
      title: "Revenue Journey",
      copy: "Track one live revenue path across BDC, sales, F&I, and delivery from the same customer and vehicle spine.",
      stages: [
        {
          key: "bdc",
          label: "BDC",
          detail: hasBdc ? "Lead engagement and callback workflow are active." : "Open the lead, reconnect, and book the next touchpoint.",
          status: hasBdc ? (hasSales ? "complete" : "active") : "active"
        },
        {
          key: "sales",
          label: "Sales",
          detail: hasSales ? "Quote, trade, or test-drive work is underway." : "Advance the opportunity, quote, or trade review.",
          status: hasSales ? (hasFi || hasDelivery ? "complete" : "active") : (hasBdc ? "active" : "upcoming")
        },
        {
          key: "fi",
          label: "F&I",
          detail: hasFi ? "Funding, warranty, or menu work is moving." : "Prepare the finance menu and funding checklist.",
          status: hasFi ? (hasDelivery ? "complete" : "active") : (hasSales ? "active" : "upcoming")
        },
        {
          key: "delivery",
          label: "Delivery",
          detail: hasDelivery ? "Delivery readiness and pickup are in motion." : "Prepare the final handoff and delivery checklist.",
          status: hasDelivery ? "active" : ((hasFi || hasSales) ? "active" : "upcoming")
        }
      ],
      overallStatus: hasDelivery
        ? "Delivery in motion"
        : hasFi
          ? "Finance engaged"
          : hasSales
            ? "Opportunity active"
            : hasBdc
              ? "BDC engaged"
              : "Waiting"
    };
  }

  return {
    title: "Service Journey",
    copy: "Track one live service path across advisor, technician, parts, and accounting.",
    stages: [
    {
      key: "service",
      label: "Service Advisor",
      detail: appointments.length
        ? "Visit booked and ready for write-up."
        : hasLoanerSignal
          ? "Transportation coordination is active and needs advisor ownership."
          : hasGeoSignal
            ? "Vehicle movement has changed and should be reviewed in the lane."
            : hasVehicleSignal
              ? "Vehicle health signal captured and waiting for advisor review."
              : hasArchiveSignal
                ? "VIN evidence added and ready for advisor follow-up."
                : serviceReady
                  ? "Advisor context is active and ready for the next lane step."
                  : "Book visit and set promised time.",
      status: serviceReady ? (techReady ? "complete" : "active") : "active"
    },
    {
      key: "technicians",
      label: "Technician",
      detail: techReady ? "Inspection / findings are in motion." : "Capture findings and diagnosis.",
      status: techReady ? (partsReady || accountingReady ? "complete" : "active") : (serviceReady ? "active" : "upcoming")
    },
    {
      key: "parts",
      label: "Parts",
      detail: partsReady ? "Pick, source, or runner dispatch is underway." : "Source parts and prepare delivery route.",
      status: partsReady ? (accountingReady ? "complete" : "active") : (techReady ? "active" : "upcoming")
    },
    {
      key: "accounting",
      label: "Accounting",
      detail: accountingReady ? "Invoice / payment workflow has started." : "Prepare statement, payment, and reconciliation.",
      status: accountingReady ? "active" : ((partsReady || techReady) ? "active" : "upcoming")
    }
  ],
    overallStatus: accountingReady
      ? "Back office in motion"
      : partsReady
        ? "Parts engaged"
        : techReady
          ? "In technician flow"
          : appointments.length
            ? "Lane ready"
            : hasLoanerSignal
              ? "Transport coordination active"
              : hasGeoSignal
                ? "Vehicle movement active"
                : hasVehicleSignal
                  ? "Vehicle signal captured"
                  : hasArchiveSignal
                    ? "VIN evidence added"
                    : serviceReady
                      ? "Advisor engaged"
                      : "Waiting"
  };
}

function buildServiceJourneyState(tasks = [], notes = [], appointments = [], calls = []) {
  const definition = getJourneyDefinition(tasks, notes, appointments, calls);
  const stages = definition.stages;
  const activeStage = stages.find((stage) => stage.status === "active") || stages[0];
  const completedCount = stages.filter((stage) => stage.status === "complete").length;
  const liveCount = stages.filter((stage) => stage.status === "active").length;
  const queuedCount = stages.filter((stage) => stage.status === "upcoming").length;
  const progressPercent = Math.round(((completedCount + (liveCount * 0.5)) / stages.length) * 100);

  return {
    ...definition,
    stages,
    activeStage,
    completedCount,
    liveCount,
    queuedCount,
    progressPercent
  };
}

function renderCustomer360Journey(tasks = [], notes = [], appointments = []) {
  const stagesEl = document.getElementById("customer360JourneyStages");
  const actionsEl = document.getElementById("customer360JourneyActions");
  const nextEl = document.getElementById("customer360JourneyNext");
  const progressEl = document.getElementById("customer360JourneyProgress");
  const historyEl = document.getElementById("customer360JourneyHistory");
  const statusEl = document.getElementById("customer360JourneyStatus");
  const feedbackEl = document.getElementById("customer360JourneyFeedback");
  const titleEl = document.getElementById("customer360JourneyTitle");
  const copyEl = document.getElementById("customer360JourneyCopy");
  if (!stagesEl || !actionsEl || !nextEl || !progressEl || !historyEl || !statusEl || !feedbackEl) return;

  const calls = (currentCalls || []).filter((call) => {
    const customer = getSelectedCustomerRecord();
    const phones = customer?.phones || [];
    return phones.includes(normalizePhoneNumber(call.from || "")) || phones.includes(normalizePhoneNumber(call.to || ""));
  });
  const { title, copy, stages, activeStage, overallStatus, completedCount, liveCount, queuedCount, progressPercent } = buildServiceJourneyState(tasks, notes, appointments, calls);
  currentJourneyArtifacts = {};
  if (titleEl) titleEl.textContent = title;
  if (copyEl) copyEl.textContent = copy;
  statusEl.textContent = overallStatus;
  statusEl.className = `customer360-status-pill ${overallStatus === "Waiting" ? "info" : overallStatus.includes("technician") || overallStatus.includes("Lane") ? "warn" : "good"}`;
  progressEl.innerHTML = `
    <div class="customer360-journey-progress-top">
      <strong>${escapeHtml(progressPercent)}% journey progress</strong>
      <span>${escapeHtml(completedCount)} done • ${escapeHtml(liveCount)} live • ${escapeHtml(queuedCount)} queued</span>
    </div>
    <div class="customer360-journey-progress-bar">
      <div class="customer360-journey-progress-fill" style="width:${Math.max(8, Math.min(progressPercent, 100))}%"></div>
    </div>
    <div class="customer360-journey-progress-meta">
      <span class="customer360-journey-progress-chip">Current: ${escapeHtml(activeStage?.label || "Service Advisor")}</span>
      <span class="customer360-journey-progress-chip">Owner: ${escapeHtml(getJourneyAssignedOwner(activeStage?.key || "service", activeStage?.status || "active"))}</span>
    </div>
  `;

  const recentAssignments = getRecentJourneyAssignments(3);
  historyEl.innerHTML = recentAssignments.length
    ? recentAssignments.map((event) => `
      <div class="customer360-journey-history-row">
        <div>
          <strong>${escapeHtml(titleCase(event.department || "journey"))} reassigned</strong>
          <span>${escapeHtml(event.body || "Owner updated.")}</span>
        </div>
        <div class="customer360-journey-history-time">${escapeHtml(formatDisplayDateTime(event.occurredAtUtc || event.createdAtUtc))}</div>
      </div>
    `).join("")
    : `<div class="customer360-empty">Recent ownership changes will appear here.</div>`;

  stagesEl.innerHTML = stages.map((stage) => {
    const isFeedback = currentJourneyFeedbackStage === stage.key;
    return `
    <div class="customer360-journey-stage ${stage.status} ${isFeedback ? "feedback" : ""}">
      <div class="customer360-journey-stage-top">
        <b>${escapeHtml(stage.label)}</b>
        <span class="customer360-status-pill customer360-journey-stage-status ${isFeedback ? "feedback" : stage.status === "complete" ? "good" : stage.status === "active" ? "warn" : "info"}">${getJourneyStageLabel(stage, isFeedback)}</span>
      </div>
      <span>${escapeHtml(stage.detail)}</span>
      <div class="customer360-journey-stage-meta">
        <div class="customer360-journey-owner">Owner: ${escapeHtml(getJourneyAssignedOwner(stage.key, stage.status))}</div>
        <select class="customer360-journey-assignee" onchange="setJourneyAssignee('${escapeHtml(stage.key)}', this.value)">
          ${renderJourneyAssigneeOptions(stage.key, getJourneyAssignedOwner(stage.key, stage.status))}
        </select>
        <small>${escapeHtml(getJourneyStageSubcopy(stage, isFeedback))}</small>
      </div>
      ${(() => {
        const artifact = getLatestJourneyArtifact(stage.key, tasks, notes, appointments);
        const sla = getJourneyArtifactSla(artifact.slaAt || artifact.movedAt);
        currentJourneyArtifacts[stage.key] = artifact;
        return `<div class="customer360-journey-artifact ${artifact.interactive ? "clickable" : ""}" ${artifact.interactive ? `onclick="openJourneyArtifact('${escapeHtml(stage.key)}')"` : ""}><strong>${escapeHtml(artifact.label)}</strong><span>${escapeHtml(artifact.detail)}</span><div class="customer360-journey-artifact-meta"><div class="customer360-journey-artifact-meta-group"><small>${escapeHtml(artifact.owner || getJourneyAssignedOwner(stage.key, stage.status))}</small><span class="customer360-journey-sla ${escapeHtml(sla.tone)}">${escapeHtml(sla.label)}</span></div><small>${escapeHtml(getJourneyArtifactMovedAtLabel(artifact.movedAt))}</small></div></div>`;
      })()}
    </div>
  `;
  }).join("");

  actionsEl.innerHTML = stages.map((stage) => `
    <button type="button" class="customer360-journey-btn ${currentDepartmentLens === getJourneyStageLens(stage.key) ? "active" : ""}" onclick="setDepartmentLens('${escapeHtml(getJourneyStageLens(stage.key))}')">${escapeHtml(stage.label)}</button>
  `).join("");

  if (activeStage) {
    const nextAction = getJourneyNextAction(activeStage.key);
    nextEl.style.display = "flex";
    nextEl.innerHTML = `
      <div class="customer360-journey-next-copy">
        <small>${escapeHtml(nextAction.eyebrow)}</small>
        <strong>${escapeHtml(nextAction.title)}</strong>
        <span>${escapeHtml(nextAction.detail)}</span>
      </div>
      <button type="button" class="customer360-journey-next-btn" onclick="runJourneyNextAction('${escapeHtml(activeStage.key)}')">${escapeHtml(nextAction.label)}</button>
    `;
  } else {
    nextEl.style.display = "none";
    nextEl.innerHTML = "";
  }

  feedbackEl.style.display = currentJourneyFeedbackMessage ? "block" : "none";
  feedbackEl.textContent = currentJourneyFeedbackMessage;

  if (activeStage && currentDepartmentLens === "home") {
    const preferredMode = activeStage.key === "service" ? "appointment" : activeStage.key === "accounting" ? "note" : "task";
    setCustomer360ComposerMode(preferredMode);
  }
}

function getCustomerPrimaryVehicle(customer) {
  if (!customer) return null;
  const vehicleIds = Array.isArray(customer.vehicleIds) ? customer.vehicleIds : [];
  return currentVehicles.find((vehicle) => vehicleIds.includes(vehicle.id)) || null;
}

function customerMatchesSearch(customer, vehicle, query) {
  if (!query) return true;
  const haystack = [
    customerDisplayName(customer),
    customer?.email || "",
    ...(customer?.phones || []),
    vehicle?.vin || "",
    vehicleDisplayName(vehicle),
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

async function loadCustomer360() {
  if (isLoadingCustomer360) return;
  isLoadingCustomer360 = true;

  try {
    const [customersRes, vehiclesRes] = await Promise.all([
      fetch("/.netlify/functions/customers-list"),
      fetch("/.netlify/functions/vehicles-list")
    ]);

    const customersData = await customersRes.json();
    const vehiclesData = await vehiclesRes.json();

    currentCustomers = Array.isArray(customersData.customers) ? customersData.customers : [];
    currentVehicles = Array.isArray(vehiclesData.vehicles) ? vehiclesData.vehicles : [];

    if (!selectedCustomerId || !currentCustomers.some((customer) => customer.id === selectedCustomerId)) {
      selectedCustomerId = currentCustomers[0]?.id || "";
    }

    await refreshSelectedCustomer360();
    renderCustomer360();
  } catch (err) {
    console.error("loadCustomer360 error:", err);
    const list = document.getElementById("customer360List");
    const summary = document.getElementById("customer360Summary");
    if (summary) summary.textContent = err.message || "Failed to load customer records.";
    if (list) list.innerHTML = `<div class="customer360-empty">Customer 360 is unavailable right now.</div>`;
  } finally {
    isLoadingCustomer360 = false;
  }
}

async function refreshSelectedCustomer360() {
  const customer = currentCustomers.find((item) => item.id === selectedCustomerId);
  if (!customer) {
    currentCustomerNotes = [];
    currentCustomerTimeline = [];
    currentRepairOrders = [];
    currentMediaAssets = [];
    currentPartOrders = [];
    currentAccountsPayableBills = [];
    currentAccountsReceivableInvoices = [];
    return;
  }

  const vehicle = getCustomerPrimaryVehicle(customer);
  const timelineParams = new URLSearchParams({ customerId: customer.id, limit: "30" });
  if (vehicle?.id) timelineParams.set("vehicleId", vehicle.id);
  const notesParams = new URLSearchParams({ customerId: customer.id });
  if (vehicle?.id) notesParams.set("vehicleId", vehicle.id);

  const [timelineRes, notesRes] = await Promise.all([
    fetch(`/.netlify/functions/timeline-list?${timelineParams.toString()}`),
    fetch(`/.netlify/functions/notes-list?${notesParams.toString()}`)
  ]);

  const timelineData = await timelineRes.json().catch(() => ({}));
  const notesData = await notesRes.json().catch(() => ({}));

  currentCustomerTimeline = Array.isArray(timelineData.events) ? timelineData.events : [];
  currentCustomerNotes = Array.isArray(notesData.notes) ? notesData.notes : [];
  await loadRepairOrders(customer.id, vehicle?.id || "");
  const activeRepairOrderId = getActiveRepairOrderRecord()?.id || "";
  await Promise.all([
    loadMediaAssets(customer.id, vehicle?.id || "", activeRepairOrderId),
    loadPartOrders(activeRepairOrderId),
    loadAccountsPayableBills(),
    loadAccountsReceivableInvoices(activeRepairOrderId)
  ]);
}

function renderCustomer360() {
  syncCustomer360LensUi();
  renderCustomer360List();
  renderCustomer360Detail();
}

function renderCustomer360List() {
  const list = document.getElementById("customer360List");
  const summary = document.getElementById("customer360Summary");
  const query = String(document.getElementById("customer360SearchBox")?.value || "").trim().toLowerCase();
  if (!list) return;

  const filtered = currentCustomers.filter((customer) => {
    const vehicle = getCustomerPrimaryVehicle(customer);
    return customerMatchesSearch(customer, vehicle, query);
  });

  if (summary) {
    summary.textContent = filtered.length
      ? `${filtered.length} customer records loaded from the live DMS backend.`
      : "No customers match the current search.";
  }

  if (!filtered.length) {
    list.innerHTML = `<div class="customer360-empty">No customer records match this search.</div>`;
    return;
  }

  list.innerHTML = filtered.map((customer) => {
    const vehicle = getCustomerPrimaryVehicle(customer);
    const activeTasks = currentTasks.filter((task) => task.customerId === customer.id && task.status !== "completed").length;
    const upcomingAppointments = currentAppointments.filter((item) => item.customerId === customer.id && item.status !== "completed").length;
    const timelineCount = currentCustomerTimeline.length && customer.id === selectedCustomerId
      ? currentCustomerTimeline.length
      : currentAppointments.filter((item) => item.customerId === customer.id).length + activeTasks;
    const isActive = customer.id === selectedCustomerId;

    return `
      <div class="customer360-item ${isActive ? "active" : ""}" data-customer360-id="${escapeHtml(customer.id)}">
        <div class="customer360-item-row">
          <div>
            <strong>${escapeHtml(customerDisplayName(customer))}</strong>
            <div class="customer360-meta">${(customer.phones || []).length ? (customer.phones || []).map((phone) => formatPhoneActionLink(phone)).join(" ") : escapeHtml(customer.email || "No primary contact")}</div>
          </div>
          <span class="customer360-item-badge">${escapeHtml(customerInitials(customer))}</span>
        </div>
        <div class="customer360-meta">${escapeHtml(vehicleDisplayName(vehicle))}</div>
        <div class="customer360-meta">${escapeHtml(customer.preferredLanguage || customer.email || "Preferred language not set")}</div>
        <div class="customer360-item-stats">
          <span class="customer360-chip">${formatCountLabel(activeTasks, "task")}</span>
          <span class="customer360-chip">${formatCountLabel(upcomingAppointments, "appointment")}</span>
          <span class="customer360-chip">${formatCountLabel((customer.phones || []).length, "phone")}</span>
          <span class="customer360-chip">${formatCountLabel(timelineCount, "event")}</span>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-customer360-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      selectedCustomerId = element.getAttribute("data-customer360-id") || "";
      await refreshSelectedCustomer360();
      renderCustomer360();
    });
  });
}


function getDepartmentLensConfig() {
  return DEPARTMENT_LENSES[currentDepartmentLens] || DEPARTMENT_LENSES.home;
}

function formatPhoneActionLink(phone, label = "", mode = "call") {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return escapeHtml(label || phone || "-");
  const display = label || formatPhonePretty(normalized);
  return `<a href="#" class="phone-link" data-phone="${escapeHtml(normalized)}" data-mode="${escapeHtml(mode)}">📞 ${escapeHtml(display)}</a>`;
}

function syncCustomer360LensUi() {
  const config = getDepartmentLensConfig();
  const shell = document.querySelector(".customer360-shell");
  const contextName = document.getElementById("customer360ContextName");
  const contextCopy = document.getElementById("customer360ContextCopy");
  const toolbarMeta = document.getElementById("customer360ToolbarMeta");
  const summaryTitle = document.getElementById("customer360SummaryTitle");
  const timelineLens = document.getElementById("customer360TimelineLens");
  const mainTitle = document.getElementById("customer360MainTitle");
  const mainSubtitle = document.getElementById("customer360MainSubtitle");
  const lensPanelTitle = document.getElementById("customer360LensPanelTitle");
  const primaryPanelTitle = document.getElementById("customer360PrimaryPanelTitle");
  const secondaryPanelTitle = document.getElementById("customer360SecondaryPanelTitle");
  const railTitle = document.getElementById("customer360RailTitle");
  const archiveTitle = document.getElementById("customer360ArchiveTitle");
  const actions = [
    document.getElementById("customer360ActionOne"),
    document.getElementById("customer360ActionTwo"),
    document.getElementById("customer360ActionThree"),
  ];

  if (contextName) contextName.textContent = config.name;
  if (contextCopy) contextCopy.textContent = config.copy;
  if (toolbarMeta) toolbarMeta.textContent = `Pinnacle Auto Group • ${config.name}`;
  if (summaryTitle) summaryTitle.textContent = config.summaryTitle;
  if (timelineLens) timelineLens.textContent = config.timelineLabel;
  if (mainTitle) mainTitle.textContent = currentDepartmentLens === "home" ? "Department Dashboards" : `${config.name} Dashboard`;
  if (mainSubtitle) {
    mainSubtitle.textContent = currentDepartmentLens === "home"
      ? "Open a department workspace. Every dashboard is interactive and tied back to the same DMS record."
      : `${config.copy} Work from this department dashboard first, then drill into the live record only when needed.`;
  }
  if (lensPanelTitle) lensPanelTitle.textContent = config.lensPanelTitle || "Work Queue";
  if (primaryPanelTitle) primaryPanelTitle.textContent = config.primaryPanelTitle || "Tasks";
  if (secondaryPanelTitle) secondaryPanelTitle.textContent = config.secondaryPanelTitle || "Notes";
  if (railTitle) railTitle.textContent = config.railTitle || "Service + Loaner";
  if (archiveTitle) archiveTitle.textContent = config.archiveTitle || "VIN Archive";
  if (shell) {
    shell.classList.toggle("department-home", currentDepartmentLens === "home");
    shell.classList.toggle("department-workspace", currentDepartmentLens !== "home");
  }

  actions.forEach((el, index) => {
    if (!el) return;
    const iconEl = el.querySelector(".customer360-action-icon");
    const label = config.actions[index] || "Action";
    el.innerHTML = `<span><span class="customer360-action-icon">${iconEl?.textContent || "◔"}</span> ${escapeHtml(label)}</span><span>›</span>`;
  });
}

function buildDepartmentRecordStripMarkup(customer, vehicle, tasks = [], appointments = []) {
  const activeRepairOrder = getActiveRepairOrderRecord();
  const roAmounts = getRepairOrderAmounts(activeRepairOrder);
  const openTasks = (tasks || []).filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const nextAppointment = (appointments || [])[0] || null;
  const primaryPhone = getSelectedCustomerPrimaryPhone();
  const config = getDepartmentLensConfig();
  const activeLabel = currentDepartmentLens === "home" ? "Current Record" : `${config.name} Workspace`;
  const actionOne = currentDepartmentLens === "service"
    ? (activeRepairOrder ? "setDepartmentLens('service')" : "openRepairOrderFrom360()")
    : currentDepartmentLens === "technicians"
      ? (activeRepairOrder ? "addTechnicianClockEvent('clock_in')" : "openRepairOrderFrom360()")
      : currentDepartmentLens === "parts"
        ? (activeRepairOrder ? "createSpecialPartOrder()" : "openRepairOrderFrom360()")
        : currentDepartmentLens === "accounting"
          ? (activeRepairOrder ? "createAccountsReceivableInvoice()" : "setDepartmentLens('accounting')")
          : primaryPhone
            ? "openSmsForPhone(getSelectedCustomerPrimaryPhone())"
            : "setDepartmentLens('home')";
  const actionOneLabel = currentDepartmentLens === "service"
    ? (activeRepairOrder ? "Open Live RO" : "Open RO")
    : currentDepartmentLens === "technicians"
      ? (activeRepairOrder ? "Clock In" : "Open RO")
      : currentDepartmentLens === "parts"
        ? (activeRepairOrder ? "Special Order" : "Open RO")
        : currentDepartmentLens === "accounting"
          ? (activeRepairOrder ? "Post AR" : "Open Accounting")
          : primaryPhone
            ? "Open Messages"
            : "Open Home";
  const actionTwo = nextAppointment
    ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(nextAppointment.id || nextAppointment.appointmentId || nextAppointment.createdAtUtc || nextAppointment.date || ""))}','${escapeHtml(String(currentDepartmentLens || "home"))}')`
    : "startDepartmentAppointmentCreate()";
  const actionTwoLabel = nextAppointment ? "Open Visit" : "Create Visit";

  return `
    <div class="customer360-record-strip">
      <div class="customer360-record-strip-main">
        <span class="customer360-record-strip-label">${escapeHtml(activeLabel)}</span>
        <strong class="customer360-record-strip-title">${escapeHtml(customerDisplayName(customer))}</strong>
        <div class="customer360-record-strip-copy">
          ${escapeHtml(vehicleDisplayName(vehicle))} ${vehicle?.vin ? `• ${vehicle.vin}` : ""}
          ${activeRepairOrder?.repairOrderNumber ? `• ${activeRepairOrder.repairOrderNumber}` : ""}
        </div>
        <div class="customer360-record-strip-actions">
          <button type="button" class="customer360-record-strip-action" onclick="${actionOne}">${escapeHtml(actionOneLabel)}</button>
          <button type="button" class="customer360-record-strip-action" onclick="${actionTwo}">${escapeHtml(actionTwoLabel)}</button>
          ${primaryPhone ? `<a href="#" class="customer360-record-strip-action phone-link" data-phone="${escapeHtml(primaryPhone)}" data-mode="call">Call</a>` : ""}
        </div>
      </div>
      <div class="customer360-record-strip-stat">
        <span>Open Tasks</span>
        <strong>${escapeHtml(String(openTasks.length))}</strong>
        <small>${escapeHtml(openTasks[0]?.title || "No open task pressure on this record.")}</small>
      </div>
      <div class="customer360-record-strip-stat">
        <span>Visit</span>
        <strong>${escapeHtml(nextAppointment ? "Booked" : "Open")}</strong>
        <small>${escapeHtml(nextAppointment?.service || "No appointment booked yet.")}</small>
      </div>
      <div class="customer360-record-strip-stat">
        <span>Repair Order</span>
        <strong>${escapeHtml(activeRepairOrder?.repairOrderNumber || "None")}</strong>
        <small>${escapeHtml(activeRepairOrder?.status || "Open the first RO from this dashboard.")}</small>
      </div>
      <div class="customer360-record-strip-stat">
        <span>Balance</span>
        <strong>${escapeHtml(formatMoney(roAmounts.balance || 0))}</strong>
        <small>${escapeHtml(activeRepairOrder ? "Live RO balance and posting posture." : "No active RO balance yet.")}</small>
      </div>
    </div>
  `;
}

function updateDepartmentMenuIndicators() {
  const openTasks = (currentTasks || []).filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const partsCount = openTasks.filter((task) => inferJourneyHandoffTarget(task.title || "", task.description || "") === "parts").length;
  const accountingCount = openTasks.filter((task) => inferJourneyHandoffTarget(task.title || "", task.description || "") === "accounting").length;

  document.querySelectorAll(".department-menu-btn").forEach((btn) => {
    const department = btn.dataset.department || "";
    const small = btn.querySelector("small");
    if (!small) return;
    const base = department === "parts"
      ? "Inventory"
      : department === "accounting"
        ? "Financials"
        : small.dataset.baseLabel || small.textContent;
    small.dataset.baseLabel = base;

    if (department === "parts" && partsCount) {
      small.textContent = `${base} • ${partsCount} new`;
    } else if (department === "accounting" && accountingCount) {
      small.textContent = `${base} • ${accountingCount} new`;
    } else {
      small.textContent = base;
    }
  });
}

function setDepartmentLens(department = "home") {
  currentDepartmentLens = DEPARTMENT_LENSES[department] ? department : "home";
  const config = getDepartmentLensConfig();

  document.querySelectorAll(".department-menu-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.department === currentDepartmentLens);
  });
  syncCustomer360LensUi();
  updateDepartmentMenuIndicators();
  currentCustomer360TimelineFilter = normalizeCustomer360TimelineFilter(config.defaultFilter || "all");
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
    item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
  });
  setCustomer360ComposerMode(config.composerMode || "note");
  renderCustomer360();
}

function initDepartmentMenu() {
  document.querySelectorAll('.department-menu-btn').forEach((btn) => {
    btn.addEventListener('click', () => setDepartmentLens(btn.dataset.department || 'home'));
  });
}

function initPhoneLinkRouting() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.phone-link');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    const phone = link.dataset.phone || '';
    const mode = (link.dataset.mode || 'call').toLowerCase();
    if (!phone) return;
    if (mode === 'sms') return openSmsForPhone(phone);
    return openDialerForPhone(phone);
  });
}

function getSelectedCustomerPrimaryPhone() {
  const customer = currentCustomers.find((item) => item.id === selectedCustomerId);
  return normalizePhoneNumber(customer?.phones?.[0] || currentConversationPhone || '');
}

function wireCustomer360Dock() {
  const callPhone = () => {
    const phone = getSelectedCustomerPrimaryPhone();
    if (phone) openDialerForPhone(phone);
  };
  const smsPhone = () => {
    const phone = getSelectedCustomerPrimaryPhone();
    if (phone) openSmsForPhone(phone);
  };
  document.getElementById('customer360DockCallBtn')?.addEventListener('click', callPhone);
  document.getElementById('customer360PrimaryCallBtn')?.addEventListener('click', callPhone);
  document.getElementById('customer360DockSmsBtn')?.addEventListener('click', smsPhone);
  document.getElementById('customer360PrimarySmsBtn')?.addEventListener('click', smsPhone);
}

function hydrateCustomer360AppointmentFields() {
  const scheduler = schedulerConfigCache || DEFAULT_CONFIG.scheduler;
  const serviceSelect = document.getElementById("customer360AppointmentService");
  const advisorSelect = document.getElementById("customer360AppointmentAdvisor");
  const transportSelect = document.getElementById("customer360AppointmentTransport");

  if (serviceSelect) {
    const previous = serviceSelect.value;
    serviceSelect.innerHTML = "";
    (scheduler.serviceTypes || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      serviceSelect.appendChild(option);
    });
    if (previous) serviceSelect.value = previous;
  }

  if (advisorSelect) {
    const previous = advisorSelect.value;
    advisorSelect.innerHTML = "";
    const advisors = (configCache?.advisors || DEFAULT_CONFIG.advisors).filter((item) => item.active);
    advisors.forEach((advisor) => {
      const option = document.createElement("option");
      option.value = advisor.name;
      option.textContent = advisor.name;
      advisorSelect.appendChild(option);
    });
    if (previous) advisorSelect.value = previous;
  }

  if (transportSelect) {
    const previous = transportSelect.value;
    transportSelect.innerHTML = "";
    (scheduler.transportOptions || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      transportSelect.appendChild(option);
    });
    if (previous) transportSelect.value = previous;
  }
}

function seedCustomer360ComposerDefaults() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const dateInput = document.getElementById("customer360AppointmentDate");
  const timeInput = document.getElementById("customer360AppointmentTime");
  const serviceSelect = document.getElementById("customer360AppointmentService");
  const taskTitle = document.getElementById("customer360TaskTitle");
  const taskDue = document.getElementById("customer360TaskDueAt");
  const taskDepartment = document.getElementById("customer360TaskDepartment");
  const taskUser = document.getElementById("customer360TaskAssignedUser");

  hydrateCustomer360AppointmentFields();
  hydrateCustomer360TaskAssignmentFields();

  if (dateInput && !dateInput.value) {
    dateInput.value = toDateInputValue(addDays(new Date(), 1));
  }

  if (timeInput && !timeInput.value) {
    timeInput.value = "10:00 AM";
  }

  if (serviceSelect && !serviceSelect.value && serviceSelect.options.length) {
    serviceSelect.value = serviceSelect.options[0].value;
  }

  if (taskTitle && !taskTitle.value) {
    taskTitle.value = vehicle ? `${vehicleDisplayName(vehicle)} follow-up` : `${customerDisplayName(customer)} follow-up`;
  }

  if (taskDue && !taskDue.value) {
    taskDue.value = toLocalDateInputValue(addDays(new Date(), 1));
  }

  if (taskDepartment && !taskDepartment.value) {
    taskDepartment.value = currentDepartmentLens === "home" ? "service" : normalizeDepartmentKey(currentDepartmentLens);
  }

  hydrateCustomer360TaskAssignmentFields(taskDepartment?.value || currentDepartmentLens);

  if (taskUser && !taskUser.value) {
    const roster = getDepartmentRoster(taskDepartment?.value || currentDepartmentLens);
    taskUser.value = roster[0] || "";
  }
}

function hydrateCustomer360TaskAssignmentFields(department = currentDepartmentLens) {
  const taskDepartment = document.getElementById("customer360TaskDepartment");
  const taskUser = document.getElementById("customer360TaskAssignedUser");
  if (!taskDepartment || !taskUser) return;

  const targetDepartment = normalizeDepartmentKey(taskDepartment.value || department || currentDepartmentLens || "service") || "service";
  const previousDepartment = taskDepartment.value;
  const previousUser = taskUser.value;

  if (!taskDepartment.options.length) {
    ["service", "bdc", "sales", "technicians", "fi", "parts", "accounting"].forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = DEPARTMENT_LENSES[item]?.name || titleCase(item);
      taskDepartment.appendChild(option);
    });
  }

  taskDepartment.value = normalizeDepartmentKey(previousDepartment || targetDepartment) || "service";
  taskUser.innerHTML = `<option value="">Department queue</option>`;
  getDepartmentRoster(taskDepartment.value).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    taskUser.appendChild(option);
  });
  taskUser.value = previousUser || customer360TaskQueueOwners[taskDepartment.value] || "";
}

function setCustomer360TaskQueueOwner(department = currentDepartmentLens, owner = "") {
  const normalizedDepartment = normalizeDepartmentKey(department);
  const next = { ...customer360TaskQueueOwners, [normalizedDepartment]: owner };
  saveCustomer360TaskQueueOwners(next);
  renderCustomer360Detail();
}

function buildDepartmentTaskQueueToolbar(department = currentDepartmentLens, tasks = []) {
  const normalizedDepartment = normalizeDepartmentKey(department);
  const roster = getDepartmentRoster(normalizedDepartment);
  const selectedOwner = customer360TaskQueueOwners[normalizedDepartment] || "";
  const visibleTasks = selectedOwner
    ? tasks.filter((task) => getTaskAssignedUser(task) === selectedOwner)
    : tasks;
  return `
    <div class="customer360-panel-item" style="align-items:center;">
      <div>
        <strong>${escapeHtml((DEPARTMENT_LENSES[normalizedDepartment]?.name || titleCase(normalizedDepartment)) + " To-Do List")}</strong>
        <div class="customer360-meta">${escapeHtml(selectedOwner ? `${selectedOwner} has ${visibleTasks.length} assigned task${visibleTasks.length === 1 ? "" : "s"}.` : `Showing the full ${DEPARTMENT_LENSES[normalizedDepartment]?.name || titleCase(normalizedDepartment)} queue.`)}</div>
      </div>
      <select class="customer360-panel-action" onchange="setCustomer360TaskQueueOwner('${escapeHtml(normalizedDepartment)}', this.value)">
        <option value="" ${selectedOwner ? "" : "selected"}>All users</option>
        ${roster.map((name) => `<option value="${escapeHtml(name)}" ${selectedOwner === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
      </select>
    </div>
  `;
}

function buildTaskAssignmentControls(task = {}, fallbackDepartment = currentDepartmentLens) {
  const taskId = escapeHtml(String(task.id || task.taskId || ""));
  if (!taskId) return "";
  const currentDepartment = getTaskAssignedDepartment(task) || normalizeDepartmentKey(fallbackDepartment) || "service";
  const currentUser = getTaskAssignedUser(task);
  const departmentSelectId = `taskAssignDept-${taskId}`;
  const userSelectId = `taskAssignUser-${taskId}`;
  const departmentOptions = ["service", "bdc", "sales", "technicians", "fi", "parts", "accounting"]
    .map((item) => `<option value="${item}" ${currentDepartment === item ? "selected" : ""}>${escapeHtml(DEPARTMENT_LENSES[item]?.name || titleCase(item))}</option>`)
    .join("");
  const userOptions = [`<option value="">Department queue</option>`]
    .concat(getDepartmentRoster(currentDepartment).map((name) => `<option value="${escapeHtml(name)}" ${currentUser === name ? "selected" : ""}>${escapeHtml(name)}</option>`))
    .join("");

  return `
    <div class="customer360-task-routing">
      <span class="customer360-task-routing-tag">${escapeHtml(currentDepartment === normalizeDepartmentKey(fallbackDepartment) ? "In queue" : "Cross-department")}</span>
      <select id="${departmentSelectId}" onchange="syncInlineTaskAssignmentUsers('${departmentSelectId}','${userSelectId}','${escapeHtml(currentUser)}')">${departmentOptions}</select>
      <select id="${userSelectId}">${userOptions}</select>
      <button type="button" onclick="reassignTask('${taskId}','${departmentSelectId}','${userSelectId}')">Assign</button>
    </div>
  `;
}

function buildTaskWorkflowRow(row = {}, fallbackDepartment = currentDepartmentLens) {
  return `
    <div class="customer360-panel-item">
      <div class="customer360-panel-item-body">
        <strong>${escapeHtml(row.title || row.label || "Task")}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail || "")}</div>
        ${row.extraHtml || ""}
        ${row.task ? buildTaskAssignmentControls(row.task, fallbackDepartment) : ""}
      </div>
      <button class="customer360-panel-action" onclick="${row.action || ""}">${escapeHtml(row.actionLabel || "Open")}</button>
    </div>
  `;
}

function buildInlineOwnerSummary(label = "", owner = "", meta = "", tone = "info") {
  const safeLabel = escapeHtml(label || "Owner");
  const safeOwner = escapeHtml(owner || "Department queue");
  const safeMeta = escapeHtml(meta || "Ready for routing");
  return `
    <div class="customer360-inline-owner ${escapeHtml(tone)}">
      <strong>${safeLabel}</strong>
      <span>${safeOwner} • ${safeMeta}</span>
    </div>
  `;
}

function getLatestRepairOrderLaborOp(repairOrder = {}) {
  const laborOps = Array.isArray(repairOrder?.laborOps) ? repairOrder.laborOps : [];
  return [...laborOps]
    .sort((a, b) => new Date(b.updatedAtUtc || b.createdAtUtc || 0).getTime() - new Date(a.updatedAtUtc || a.createdAtUtc || 0).getTime())[0] || null;
}

function getRepairOrderAccountingReviewTask(repairOrder = {}) {
  const repairOrderNumber = String(repairOrder?.repairOrderNumber || "").toLowerCase();
  const activeTasks = (currentTasks || []).filter((task) => {
    if (task.customerId !== selectedCustomerId) return false;
    if (String(task.status || "").toLowerCase() === "completed") return false;
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    if (!haystack.includes("[accounting]")) return false;
    return repairOrderNumber ? haystack.includes(repairOrderNumber) : true;
  });
  return activeTasks[0] || null;
}

function getActiveServiceAdvisorRoster() {
  return (configCache?.advisors || DEFAULT_CONFIG.advisors || [])
    .filter((advisor) => advisor.active !== false)
    .map((advisor) => advisor.name)
    .filter(Boolean);
}

function buildAppointmentAdvisorControls(appointment = {}) {
  const appointmentId = escapeHtml(String(appointment.id || appointment.appointmentId || ""));
  if (!appointmentId) return "";
  const selectId = `apptAdvisor-${appointmentId}`;
  const currentAdvisor = String(appointment.advisor || "");
  const options = getActiveServiceAdvisorRoster()
    .map((name) => `<option value="${escapeHtml(name)}" ${currentAdvisor === name ? "selected" : ""}>${escapeHtml(name)}</option>`)
    .join("");
  return `
    <div class="customer360-task-routing">
      ${buildInlineOwnerSummary("Appointment owner", currentAdvisor || "Advisor queue", appointment.status ? titleCase(appointment.status) : "Unassigned visit", currentAdvisor ? "good" : "warn")}
      <span class="customer360-task-routing-tag">Advisor</span>
      <select id="${selectId}">${options}</select>
      <button type="button" onclick="assignAppointmentAdvisor('${appointmentId}','${selectId}')">Assign</button>
    </div>
  `;
}

async function assignAppointmentAdvisor(appointmentId, selectId) {
  try {
    const select = document.getElementById(selectId);
    const advisor = select?.value || "";
    const res = await fetch("/.netlify/functions/appointments-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        advisor,
        notes: advisor ? `Advisor assigned to ${advisor}.` : ""
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to assign advisor");
    await loadAppointments();
    await refreshSelectedCustomer360();
    renderCustomer360();
  } catch (err) {
    console.error("assignAppointmentAdvisor error:", err);
  }
}

function buildLaborDispatchControls(repairOrder = {}) {
  const repairOrderId = escapeHtml(String(repairOrder.id || repairOrder.repairOrderId || ""));
  if (!repairOrderId) return "";
  const selectId = `laborTech-${repairOrderId}`;
  const roster = getDepartmentRoster("technicians");
  const activeLaborOp = getLatestRepairOrderLaborOp(repairOrder);
  return `
    <div class="customer360-task-routing">
      ${buildInlineOwnerSummary(
        "Dispatch owner",
        activeLaborOp?.technicianName || "Technician queue",
        activeLaborOp?.dispatchStatus ? titleCase(activeLaborOp.dispatchStatus) : "Ready to dispatch",
        activeLaborOp?.technicianName ? "info" : "warn"
      )}
      <span class="customer360-task-routing-tag">Dispatch</span>
      <select id="${selectId}">
        ${roster.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}
      </select>
      <button type="button" onclick="dispatchRepairOrderLabor('${repairOrderId}','${selectId}')">Dispatch</button>
    </div>
  `;
}

async function dispatchRepairOrderLabor(repairOrderId, selectId) {
  try {
    const select = document.getElementById(selectId);
    const technicianName = select?.value || "";
    const activeRepairOrder = getActiveRepairOrderRecord();
    const res = await fetch("/.netlify/functions/service-repair-order-labor-op", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repairOrderId,
        opCode: "DISPATCH",
        description: activeRepairOrder?.complaint || "Advisor-dispatched labor operation",
        technicianName,
        dispatchStatus: "dispatched",
        payType: "customer",
        soldHours: 1
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to dispatch labor op");
    await refreshSelectedCustomer360();
    renderCustomer360();
  } catch (err) {
    console.error("dispatchRepairOrderLabor error:", err);
  }
}

function buildAccountingHandoffControls(repairOrder = {}) {
  const repairOrderId = escapeHtml(String(repairOrder.id || repairOrder.repairOrderId || ""));
  if (!repairOrderId) return "";
  const selectId = `accountingOwner-${repairOrderId}`;
  const roster = getDepartmentRoster("accounting");
  const accountingTask = getRepairOrderAccountingReviewTask(repairOrder);
  return `
    <div class="customer360-task-routing">
      ${buildInlineOwnerSummary(
        "Review owner",
        accountingTask?.assignedUser || "Accounting queue",
        accountingTask ? "Review already open" : "Ready to hand off",
        accountingTask?.assignedUser ? "good" : accountingTask ? "info" : "warn"
      )}
      <span class="customer360-task-routing-tag">Accounting</span>
      <select id="${selectId}">
        ${roster.map((name) => `<option value="${escapeHtml(name)}" ${accountingTask?.assignedUser === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
      </select>
      <button type="button" onclick="sendRepairOrderToAccounting('${repairOrderId}','${selectId}')">${accountingTask ? "Reassign" : "Send Review"}</button>
    </div>
  `;
}

async function sendRepairOrderToAccounting(repairOrderId, selectId) {
  try {
    const owner = document.getElementById(selectId)?.value || "";
    const customer = getSelectedCustomerRecord();
    const vehicle = getSelectedVehicleRecord();
    const activeRepairOrder = getActiveRepairOrderRecord();
    if (!customer) return;
    const res = await fetch("/.netlify/functions/tasks-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        vehicleId: vehicle?.id || null,
        assignedDepartment: "accounting",
        assignedUser: owner,
        title: `[ACCOUNTING] ${activeRepairOrder?.repairOrderNumber || "RO"} balance review`,
        description: `[ACCOUNTING] Review ${activeRepairOrder?.repairOrderNumber || "repair order"} for posting, balance due, and closeout.`,
        priority: "high",
        dueAtUtc: new Date().toISOString()
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to hand off to accounting");
    await loadTasks();
    await refreshSelectedCustomer360();
    renderCustomer360();
  } catch (err) {
    console.error("sendRepairOrderToAccounting error:", err);
  }
}

function syncInlineTaskAssignmentUsers(departmentSelectId, userSelectId, selectedUser = "") {
  const departmentEl = document.getElementById(departmentSelectId);
  const userEl = document.getElementById(userSelectId);
  if (!departmentEl || !userEl) return;
  const department = normalizeDepartmentKey(departmentEl.value || "service");
  const previousUser = userEl.value || selectedUser || "";
  userEl.innerHTML = `<option value="">Department queue</option>`;
  getDepartmentRoster(department).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    userEl.appendChild(option);
  });
  userEl.value = previousUser;
}

async function reassignTask(taskId, departmentSelectId, userSelectId) {
  try {
    const departmentEl = document.getElementById(departmentSelectId);
    const userEl = document.getElementById(userSelectId);
    const assignedDepartment = normalizeDepartmentKey(departmentEl?.value || "");
    const assignedUser = userEl?.value || "";
    const res = await fetch("/.netlify/functions/tasks-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        assignedDepartment,
        assignedUser
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to reassign task");
    await loadTasks();
    await refreshSelectedCustomer360();
    renderCustomer360();
  } catch (err) {
    console.error("reassignTask error:", err);
  }
}

function setCustomer360ComposerStatus(message = "", tone = "default") {
  const status = document.getElementById("customer360ComposerStatus");
  if (!status) return;
  status.textContent = message;
  status.style.color = tone === "success" ? "#86efac" : tone === "error" ? "#fca5a5" : "#97abc8";
}

function setCustomer360ComposerMode(mode = "note") {
  currentCustomer360ComposerMode = ["note", "task", "appointment"].includes(mode) ? mode : "note";
  const copy = document.getElementById("customer360ComposerCopy");
  const submit = document.getElementById("customer360ComposerSubmit");
  const taskFields = document.getElementById("customer360TaskFields");
  const appointmentFields = document.getElementById("customer360AppointmentFields");

  document.querySelectorAll("[data-composer-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.composerMode === currentCustomer360ComposerMode);
  });

  if (copy) copy.textContent = getCustomer360ComposerCopy(currentCustomer360ComposerMode);
  if (submit) submit.textContent = getCustomer360ComposerButtonLabel(currentCustomer360ComposerMode);
  if (taskFields) taskFields.classList.toggle("active", currentCustomer360ComposerMode === "task");
  if (appointmentFields) appointmentFields.classList.toggle("active", currentCustomer360ComposerMode === "appointment");
  if (currentCustomer360ComposerMode === "appointment") hydrateCustomer360AppointmentFields();
  seedCustomer360ComposerDefaults();
}

function inferComposerModeFromActionLabel(label = "") {
  const normalized = String(label).toLowerCase();
  if (normalized.includes("appoint") || normalized.includes("service")) return "appointment";
  if (normalized.includes("note")) return "note";
  return "task";
}

function initCustomer360Composer() {
  hydrateCustomer360AppointmentFields();
  hydrateCustomer360TaskAssignmentFields();
  setCustomer360ComposerMode(currentCustomer360ComposerMode);

  document.querySelectorAll("[data-composer-mode]").forEach((button) => {
    button.addEventListener("click", () => setCustomer360ComposerMode(button.dataset.composerMode || "note"));
  });

  ["customer360ActionOne", "customer360ActionTwo", "customer360ActionThree"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      const label = document.getElementById(id)?.textContent || "";
      setCustomer360ComposerMode(inferComposerModeFromActionLabel(label));
      document.getElementById("customer360ComposerBody")?.focus();
    });
  });

  document.getElementById("customer360ComposerSubmit")?.addEventListener("click", submitCustomer360Composer);
  document.getElementById("customer360TaskDepartment")?.addEventListener("change", (event) => {
    hydrateCustomer360TaskAssignmentFields(event.target?.value || currentDepartmentLens);
  });
}

function renderCustomer360Timeline() {
  const timelineEl = document.getElementById("customer360Timeline");
  const vinSummaryEl = document.getElementById("customer360VinSummary");
  const vinActionsEl = document.getElementById("customer360VinActions");
  if (!timelineEl) return;

  const vinItems = currentCustomer360TimelineCards.filter((item) => categorizeCustomer360TimelineItem(item) === "vin");
  const vinHealthCount = vinItems.filter((item) => String(item.type || "").toLowerCase().includes("vehicle health")).length;
  const vinMovementCount = vinItems.filter((item) => String(item.type || "").toLowerCase().includes("vehicle movement")).length;
  const vinArchiveCount = vinItems.filter((item) => String(item.type || "").toLowerCase().includes("vin archive")).length;
  const latestVinHealth = vinItems.find((item) => String(item.type || "").toLowerCase().includes("vehicle health"));
  const latestVinMovement = vinItems.find((item) => String(item.type || "").toLowerCase().includes("vehicle movement"));
  const latestVinArchive = vinItems.find((item) => String(item.type || "").toLowerCase().includes("vin archive"));

  if (vinSummaryEl) {
    vinSummaryEl.innerHTML = `
      <button type="button" class="customer360-vin-summary-chip health ${currentCustomer360TimelineFilter === "vin" && currentCustomer360VinFilter === "health" ? "active" : ""}" onclick="openVinTimelineSubtype('health')"><span class="customer360-vin-summary-chip-content"><strong>${vinHealthCount} Health</strong><small>${escapeHtml(latestVinHealth ? latestVinHealth.time : "No updates")}</small></span></button>
      <button type="button" class="customer360-vin-summary-chip movement ${currentCustomer360TimelineFilter === "vin" && currentCustomer360VinFilter === "movement" ? "active" : ""}" onclick="openVinTimelineSubtype('movement')"><span class="customer360-vin-summary-chip-content"><strong>${vinMovementCount} Movement</strong><small>${escapeHtml(latestVinMovement ? latestVinMovement.time : "No updates")}</small></span></button>
      <button type="button" class="customer360-vin-summary-chip archive ${currentCustomer360TimelineFilter === "vin" && currentCustomer360VinFilter === "archive" ? "active" : ""}" onclick="openVinTimelineSubtype('archive')"><span class="customer360-vin-summary-chip-content"><strong>${vinArchiveCount} Archive</strong><small>${escapeHtml(latestVinArchive ? latestVinArchive.time : "No updates")}</small></span></button>
    `;
  }

  if (vinActionsEl) {
    const activeVinMode = normalizeCustomer360TimelineFilter(currentCustomer360TimelineFilter) === "vin";
    vinActionsEl.style.display = activeVinMode ? "flex" : "none";
    if (activeVinMode) {
      const subtype = currentCustomer360VinFilter;
      const primaryAction = subtype === "movement"
        ? { label: "Log Movement", action: "startVehicleGeoMovementNote()" }
        : subtype === "archive"
          ? { label: "Add VIN Archive Entry", action: "startVinArchiveEntryNote()" }
          : { label: "Log Health Event", action: "startVehicleHealthEventNote()" };
      vinActionsEl.innerHTML = `
        <button type="button" class="customer360-mini-btn" onclick="${primaryAction.action}">${primaryAction.label}</button>
        <button type="button" class="customer360-mini-btn" onclick="openVehicleJourneyStage('service')">Open Service</button>
      `;
    } else {
      vinActionsEl.innerHTML = "";
    }
  }

  const filter = normalizeCustomer360TimelineFilter(currentCustomer360TimelineFilter);
  const items = currentCustomer360TimelineCards.filter((item) => {
    if (filter === "all") return true;
    if (filter === "vin") {
      return categorizeCustomer360TimelineItem(item) === "vin"
        && (currentCustomer360VinFilter === "all" || getVinTimelineSubtype(item) === currentCustomer360VinFilter);
    }
    return categorizeCustomer360TimelineItem(item) === filter;
  });

  if (!items.length) {
    if (filter === "vin") {
      const emptyState = getVinEmptyStateConfig(currentCustomer360VinFilter);
      timelineEl.innerHTML = `
        <div class="customer360-empty">
          <div>${escapeHtml(emptyState.label)}</div>
          <div style="margin-top:12px;">
            <button type="button" class="customer360-mini-btn" onclick="${emptyState.action}">${escapeHtml(emptyState.actionLabel)}</button>
          </div>
        </div>
      `;
      return;
    }
    timelineEl.innerHTML = `<div class="customer360-empty">No ${escapeHtml(filter === "activity" ? "additional activity" : filter)} on this timeline yet.</div>`;
    return;
  }

  timelineEl.innerHTML = items.map((item) => `
    <div class="customer360-timeline-item ${getTimelineVisualTone(item)} ${currentCustomer360Focus && currentCustomer360Focus.kind === categorizeCustomer360TimelineItem(item) && String(currentCustomer360Focus.sourceId) === String(item.sourceId || "") ? "focused" : ""}">
      <div class="customer360-timeline-inner">
        <div class="customer360-timeline-item-head">
          <div class="customer360-timeline-kind">
            <span class="customer360-timeline-kind-icon">${getTimelineEventIcon(item.type)}</span>
            <span>${escapeHtml(item.type)}</span>
          </div>
          <div class="customer360-timeline-time">${escapeHtml(item.time)}</div>
        </div>
        <div class="customer360-timeline-copy">${escapeHtml(item.body)}</div>
        ${item.subcopy ? `<div class="customer360-timeline-subcopy">${escapeHtml(item.subcopy)}</div>` : ""}
        ${item.actions?.length ? `
          <div class="customer360-timeline-actions">
            ${item.actions.map((action) => `
              <span class="customer360-chip-callout ${action.light ? "light" : ""}">${escapeHtml(action.label)}</span>
            `).join("")}
          </div>
        ` : ""}
        ${buildFocusedTimelineAdvanceActions(item)}
      </div>
    </div>
  `).join("");
}

function initCustomer360TimelineFilters() {
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentCustomer360TimelineFilter = normalizeCustomer360TimelineFilter(chip.dataset.filter || "all");
      if (currentCustomer360TimelineFilter !== "vin") {
        currentCustomer360VinFilter = "all";
      }
      document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((item) => {
        item.classList.toggle("active", normalizeCustomer360TimelineFilter(item.dataset.filter || "all") === currentCustomer360TimelineFilter);
      });
      renderCustomer360Timeline();
    });
  });
}

async function createCustomer360Note() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const body = stampJourneyArtifact(getValue("customer360ComposerBody").trim());
  if (!customer || !body) throw new Error("Select a customer and enter a note first.");

  const res = await fetch("/.netlify/functions/notes-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      body,
      noteType: "internal"
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create note");
  return data;
}

async function createCustomer360Task() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const body = stampJourneyArtifact(getValue("customer360ComposerBody").trim());
  const title = stampJourneyArtifact(getValue("customer360TaskTitle").trim());
  const assignedDepartment = normalizeDepartmentKey(getValue("customer360TaskDepartment") || currentDepartmentLens || "service");
  const assignedUser = getValue("customer360TaskAssignedUser").trim();
  if (!customer) throw new Error("Select a customer before creating a task.");

  const res = await fetch("/.netlify/functions/tasks-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      assignedDepartment,
      assignedUser,
      title: title || "Customer follow-up",
      description: body,
      priority: "normal",
      dueAtUtc: getValue("customer360TaskDueAt") ? new Date(getValue("customer360TaskDueAt")).toISOString() : null
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create task");
  return data;
}

async function createCustomer360Appointment() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) throw new Error("Select a customer before scheduling service.");

  const [firstName = "", ...rest] = customerDisplayName(customer).split(" ");
  const lastName = rest.join(" ");

  const res = await fetch("/.netlify/functions/book-appointment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      firstName,
      lastName,
      phone: customer.phones?.[0] || "",
      email: customer.email || "",
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      year: vehicle?.year ? String(vehicle.year) : "",
      vin: vehicle?.vin || "",
      service: getValue("customer360AppointmentService"),
      advisor: getValue("customer360AppointmentAdvisor"),
      date: getValue("customer360AppointmentDate"),
      time: getValue("customer360AppointmentTime"),
      transport: getValue("customer360AppointmentTransport"),
      notes: stampJourneyArtifact(getValue("customer360ComposerBody").trim()),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to schedule service");
  return data;
}

async function createAutomaticJourneyTask({ customer, vehicle, title, description, dueAtUtc = null, assignedDepartment = "", assignedUser = "" }) {
  const res = await fetch("/.netlify/functions/tasks-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      assignedDepartment,
      assignedUser,
      title,
      description,
      priority: "normal",
      dueAtUtc
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create automatic journey task");
  return data;
}

function inferAutomaticJourneyHandoff({ mode = "note", lens = "home", body = "", title = "", service = "" }) {
  const haystack = `${title} ${body} ${service}`.toLowerCase();

  if (mode === "appointment" && (lens === "service" || lens === "home")) {
    return "technicians";
  }

  if (lens === "bdc" && (mode === "note" || mode === "task") && (haystack.includes("lead") || haystack.includes("callback") || haystack.includes("quote") || haystack.includes("appointment"))) {
    return "sales";
  }

  if (lens === "sales" && (mode === "note" || mode === "task" || mode === "appointment") && (haystack.includes("deal") || haystack.includes("quote") || haystack.includes("trade") || haystack.includes("test drive"))) {
    return "fi";
  }

  if (lens === "fi" && (mode === "note" || mode === "task") && (haystack.includes("finance") || haystack.includes("funding") || haystack.includes("warranty") || haystack.includes("[fi]"))) {
    return "delivery";
  }

  if (lens === "technicians" && (mode === "note" || mode === "task") && haystack.includes("[technician]")) {
    return "parts";
  }

  if (lens === "parts" && (mode === "note" || mode === "task") && haystack.includes("[parts]")) {
    return "accounting";
  }

  return "";
}

function buildAutomaticJourneyTaskPayload(target = "", customer, vehicle, context = {}) {
  const customerName = customerDisplayName(customer);
  const vehicleName = vehicleDisplayName(vehicle);
  const dueAtUtc = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const concern = context.service || "customer concern";

  if (target === "technicians") {
    return {
      title: `[TECHNICIAN] ${vehicleName} diagnostic review`,
      description: `[TECHNICIAN] ${customerName} • ${vehicleName}\nAuto-created from service write-up.\nConcern: ${concern}\nNext step:\n- Verify concern\n- Capture findings\n- Return recommendations to advisor`,
      dueAtUtc
    };
  }

  if (target === "sales") {
    return {
      title: `[SALES] ${vehicleName} opportunity review`,
      description: `[SALES] ${customerName} • ${vehicleName}\nAuto-created from BDC engagement.\nContext:\n${context.body || context.title || "Lead reconnected and ready for desk follow-up."}\nNext step:\n- Quote or trade review\n- Confirm test drive / showroom visit\n- Advance deal task`,
      dueAtUtc
    };
  }

  if (target === "fi") {
    return {
      title: `[FI] ${vehicleName} finance review`,
      description: `[FI] ${customerName} • ${vehicleName}\nAuto-created from sales workflow.\nSales context:\n${context.body || context.title || "Deal moved forward from sales."}\nNext step:\n- Funding checklist\n- Warranty / menu review\n- Prepare delivery readiness`,
      dueAtUtc
    };
  }

  if (target === "delivery") {
    return {
      title: `[DELIVERY] ${vehicleName} final handoff`,
      description: `[DELIVERY] ${customerName} • ${vehicleName}\nAuto-created from F&I workflow.\nFinance context:\n${context.body || context.title || "Funding step completed."}\nNext step:\n- Confirm paperwork complete\n- Prepare pickup handoff\n- Mark delivery ready`,
      dueAtUtc
    };
  }

  if (target === "parts") {
    return {
      title: `[PARTS] ${vehicleName} sourcing review`,
      description: `[PARTS] ${customerName} • ${vehicleName}\nAuto-created from technician findings.\nInspection context:\n${context.body || "Technician findings saved."}\nNext step:\n- Confirm stock / transfer / special order\n- Set ETA\n- Route to bay / runner`,
      dueAtUtc
    };
  }

  if (target === "accounting") {
    return {
      title: `[ACCOUNTING] ${vehicleName} invoice review`,
      description: `[ACCOUNTING] ${customerName} • ${vehicleName}\nAuto-created from parts workflow.\nParts context:\n${context.body || context.title || "Parts workflow progressed."}\nNext step:\n- Review billable items\n- Prepare statement / payment request\n- Reconcile service outcome`,
      dueAtUtc
    };
  }

  return null;
}

async function maybeCreateAutomaticJourneyHandoff({ mode = "note", lens = "home", body = "", title = "", service = "" }) {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  if (!customer) return "";

  const target = inferAutomaticJourneyHandoff({ mode, lens, body, title, service });
  if (!target) return "";

  const payload = buildAutomaticJourneyTaskPayload(target, customer, vehicle, { body, title, service });
  if (!payload) return "";

  await createAutomaticJourneyTask({
    customer,
    vehicle,
    assignedDepartment: target,
    assignedUser: getDepartmentRoster(target)[0] || "",
    title: payload.title,
    description: payload.description,
    dueAtUtc: payload.dueAtUtc
  });

  return target;
}

async function submitCustomer360Composer() {
  try {
    setCustomer360ComposerStatus("Saving...");
    const rawBody = getValue("customer360ComposerBody").trim();
    const rawTitle = getValue("customer360TaskTitle").trim();
    const rawService = getValue("customer360AppointmentService").trim();
    const handoffTarget = currentCustomer360ComposerMode === "task"
      ? inferJourneyHandoffTarget(rawTitle, rawBody)
      : "";
    const automaticTarget = inferAutomaticJourneyHandoff({
      mode: currentCustomer360ComposerMode,
      lens: currentDepartmentLens,
      body: stampJourneyArtifact(rawBody),
      title: stampJourneyArtifact(rawTitle),
      service: rawService
    });
    if (currentCustomer360ComposerMode === "task") {
      await createCustomer360Task();
    } else if (currentCustomer360ComposerMode === "appointment") {
      await createCustomer360Appointment();
    } else {
      await createCustomer360Note();
    }

    if (automaticTarget) {
      await maybeCreateAutomaticJourneyHandoff({
        mode: currentCustomer360ComposerMode,
        lens: currentDepartmentLens,
        body: stampJourneyArtifact(rawBody),
        title: stampJourneyArtifact(rawTitle),
        service: rawService
      });
    }

    const composerBody = document.getElementById("customer360ComposerBody");
    if (composerBody) composerBody.value = "";
    if (currentCustomer360ComposerMode !== "appointment") {
      const taskTitle = document.getElementById("customer360TaskTitle");
      if (taskTitle) taskTitle.value = "";
    }

    setCustomer360ComposerStatus(
      currentCustomer360ComposerMode === "appointment" ? `${titleCase(getJourneyArtifactLabel())} step saved to the shared journey.` :
      currentCustomer360ComposerMode === "task" ? `${titleCase(getJourneyArtifactLabel())} task added to the shared journey.` : `${titleCase(getJourneyArtifactLabel())} note saved to the shared journey.`,
      "success"
    );

    await loadTasks();
    await loadAppointments();
    await refreshSelectedCustomer360();
    renderCustomer360();
    seedCustomer360ComposerDefaults();

    const nextLens = automaticTarget || handoffTarget;
    if (nextLens && (currentDepartmentLens === "service" || currentDepartmentLens === "home" || currentDepartmentLens === "technicians" || currentDepartmentLens === "parts" || currentDepartmentLens === "bdc" || currentDepartmentLens === "sales" || currentDepartmentLens === "fi")) {
      setDepartmentLens(getJourneyStageLens(nextLens));
      setCustomer360ComposerStatus(`${titleCase(nextLens)} handoff created and ready.`, "success");
    }
  } catch (err) {
    setCustomer360ComposerStatus(err.message || "Unable to save.", "error");
  }
}


function renderCustomer360Detail() {
  const customer = currentCustomers.find((item) => item.id === selectedCustomerId);
  const vehicle = getCustomerPrimaryVehicle(customer);
  const config = getDepartmentLensConfig();
  const calls = (currentCalls || []).filter((call) => {
    const phones = customer?.phones || [];
    return phones.includes(normalizePhoneNumber(call.from || "")) || phones.includes(normalizePhoneNumber(call.to || ""));
  });
  const tasks = (currentTasks || []).filter((task) => task.customerId === customer?.id);
  const appointments = (currentAppointments || []).filter((item) => item.customerId === customer?.id);
  const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed");
  const batteryState = inferVehicleBatteryHealth(vehicle, appointments);
  const recallState = inferVehicleRecallState(vehicle, tasks);
  const maintenanceState = inferVehicleMaintenanceState(appointments, tasks);
  const vinMediaAssets = getVinArchiveMediaAssets();
  const archiveCount = currentCustomerNotes.length + currentCustomerTimeline.length + calls.length + currentMediaAssets.length;
  const latestVehicleArtifact = getLatestTaggedArtifact("[vehicle]", currentCustomerNotes, currentCustomerTimeline);
  const latestArchiveArtifact = getLatestTaggedArtifact("[archive]", currentCustomerNotes, currentCustomerTimeline);
  const latestArchiveMedia = vinMediaAssets[0] || null;
  const vehicleSignalCount = [...currentCustomerNotes, ...currentCustomerTimeline]
    .filter((item) => String(item.body || "").toLowerCase().startsWith("[vehicle]")).length;
  const archiveSignalCount = [...currentCustomerNotes, ...currentCustomerTimeline]
    .filter((item) => String(item.body || "").toLowerCase().startsWith("[archive]")).length;
  const archiveFollowUpCount = openTasks.filter((task) => {
    const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return haystack.includes("[archive]") || haystack.includes("archive");
  }).length;
  const latestVehiclePresentation = latestVehicleArtifact
    ? getTaggedTimelinePresentation(latestVehicleArtifact.body || "", "Vehicle Health", "Vehicle intelligence")
    : null;
  const latestArchivePresentation = latestArchiveArtifact
    ? getTaggedTimelinePresentation(latestArchiveArtifact.body || "", "VIN Archive", "VIN-specific record")
    : latestArchiveMedia
      ? { body: `${latestArchiveMedia.fileName || "Media asset"} • ${latestArchiveMedia.caption || "VIN archive media"}` }
      : null;
  const lastVehicleOpsAt = latestVehicleArtifact?.occurredAtUtc
    || latestVehicleArtifact?.updatedAtUtc
    || latestArchiveArtifact?.occurredAtUtc
    || latestArchiveArtifact?.updatedAtUtc
    || latestArchiveMedia?.capturedAtUtc
    || latestVehicleArtifact?.createdAtUtc
    || latestArchiveArtifact?.createdAtUtc
    || "";
  const vehicleOpsFreshness = lastVehicleOpsAt
    ? formatDisplayDateTime(lastVehicleOpsAt).replace(/^Today at\s*/i, "")
    : "Now";
  const vehicleJourney = buildVehicleJourneyState(currentCustomerNotes, tasks, appointments);
  const vehicleJourneyNext = getVehicleJourneyNextAction(vehicleJourney);
  const aiSummary = buildCustomerAiSummary(customer, vehicle, calls, currentCustomerTimeline, tasks, appointments);

  const summaryTitleEl = document.getElementById("customer360SummaryTitle");
  const mainTitleEl = document.getElementById("customer360MainTitle");
  const mainSubtitleEl = document.getElementById("customer360MainSubtitle");
  const customerCardEl = document.getElementById("customer360CustomerCard");
  const aiSummaryEl = document.getElementById("customer360AiSummary");
  const summaryActionsEl = document.getElementById("customer360SummaryActions");
  const journeyStagesEl = document.getElementById("customer360JourneyStages");
  const journeyActionsEl = document.getElementById("customer360JourneyActions");
  const journeyStatusEl = document.getElementById("customer360JourneyStatus");
  const vehicleTitleEl = document.getElementById("customer360VehicleTitle");
  const vehicleRailEl = document.getElementById("customer360VehicleRail");
  const archiveCountEl = document.getElementById("customer360ArchiveCount");
  const lensPanelEl = document.getElementById("customer360LensPanel");
  const tasksBoardEl = document.getElementById("customer360TasksBoard");
  const notesBoardEl = document.getElementById("customer360NotesBoard");
  const serviceLaneEl = document.getElementById("customer360ServiceLane");
  const filesPanelEl = document.getElementById("customer360FilesPanel");
  const timelineEl = document.getElementById("customer360Timeline");
  const timelineSectionEl = document.getElementById("customer360TimelineSection");
  const opsStripEl = document.getElementById("customer360OpsStrip");
  const managerQueueEl = document.getElementById("customer360ManagerQueue");
  const roBoardEl = document.getElementById("customer360RoBoard");
  const departmentHubEl = document.getElementById("customer360DepartmentHub");
  const departmentDashboardEl = document.getElementById("customer360DepartmentDashboard");
  const roleToolsEl = document.getElementById("customer360RoleTools");
  const overdueTasks = openTasks.filter((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
  const urgentTasks = openTasks.filter((task) => {
    const tone = getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone;
    return tone === "warn" || tone === "danger";
  });

  if (!customer) {
    currentCustomer360TimelineCards = [];
    if (mainTitleEl) mainTitleEl.textContent = currentDepartmentLens === "home" ? "Department Dashboards" : `${config.name} Dashboard`;
    if (mainSubtitleEl) mainSubtitleEl.textContent = "Storewide department dashboards stay available here. Select a row to drill into a live customer workspace.";
    if (summaryTitleEl) summaryTitleEl.textContent = getDepartmentLensConfig().summaryTitle || "AI Summary";
    if (customerCardEl) customerCardEl.innerHTML = `<div class="customer360-empty">Select a customer to load the 360 dashboard.</div>`;
    if (aiSummaryEl) aiSummaryEl.textContent = "Select a customer to generate a timeline-aware summary.";
    if (summaryActionsEl) summaryActionsEl.innerHTML = "";
    if (journeyStagesEl) journeyStagesEl.innerHTML = `<div class="customer360-empty">Choose a customer to activate the cross-department service journey.</div>`;
    if (journeyActionsEl) journeyActionsEl.innerHTML = "";
    if (journeyStatusEl) {
      journeyStatusEl.textContent = "Waiting";
      journeyStatusEl.className = "customer360-status-pill info";
    }
    if (vehicleTitleEl) vehicleTitleEl.textContent = "No linked vehicle";
    if (vehicleRailEl) vehicleRailEl.innerHTML = `<div class="customer360-empty">Choose a customer to load vehicle intelligence.</div>`;
    if (archiveCountEl) archiveCountEl.textContent = "0 Items";
    if (lensPanelEl) lensPanelEl.innerHTML = `<div class="customer360-empty">Department work queue will appear here.</div>`;
    if (tasksBoardEl) tasksBoardEl.innerHTML = `<div class="customer360-empty">No tasks yet.</div>`;
    if (notesBoardEl) notesBoardEl.innerHTML = `<div class="customer360-empty">No notes yet.</div>`;
    if (serviceLaneEl) serviceLaneEl.innerHTML = `<div class="customer360-empty">Service lane, appointment, and loaner signals will appear here.</div>`;
    if (filesPanelEl) filesPanelEl.innerHTML = `<div class="customer360-empty">VIN files will appear here.</div>`;
    if (timelineEl) timelineEl.innerHTML = `<div class="customer360-empty">Choose a customer to load the unified timeline.</div>`;
    if (timelineSectionEl) timelineSectionEl.style.display = "none";
    if (opsStripEl) opsStripEl.innerHTML = "";
    if (managerQueueEl) managerQueueEl.innerHTML = "";
    if (roBoardEl) roBoardEl.innerHTML = "";
    if (departmentHubEl) departmentHubEl.innerHTML = buildRoleWorkspaceToolsMarkup(null, null, [], [], []);
    if (departmentDashboardEl) {
      departmentDashboardEl.className = `customer360-department-dashboard ${escapeHtml(String(currentDepartmentLens || "home"))}`;
      departmentDashboardEl.innerHTML = buildDepartmentDashboardMarkup(null, null, [], [], []);
    }
    if (roleToolsEl) roleToolsEl.innerHTML = buildRoleWorkspaceToolsMarkup(null, null, [], [], []);
    return;
  }

  const roFocusedLenses = new Set(["service", "technicians", "parts", "accounting"]);
  if (timelineSectionEl) timelineSectionEl.style.display = "none";
  if (roBoardEl) roBoardEl.style.display = roFocusedLenses.has(currentDepartmentLens) ? "" : "none";

  if (opsStripEl) {
    const serviceTasks = openTasks.filter((task) => {
      const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return haystack.includes("[service]") || haystack.includes("advisor") || haystack.includes("loaner") || haystack.includes("transport");
    });
    const bdcTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[bdc]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("callback"));
    const salesTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[sales]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("quote") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("deal"));
    const accountingTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[accounting]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("invoice") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("ledger"));
    const loanerTask = openTasks.find((task) => {
      const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return haystack.includes("loaner") || haystack.includes("transport");
    });
    const missedCall = calls.find((call) => String(call.status || "").toLowerCase().includes("miss"));
    const activeAppointment = appointments[0] || null;
    const pressureTone = overdueTasks.length ? "danger" : urgentTasks.length ? "warn" : "good";
    const pressureLabel = overdueTasks.length ? "Overdue risk" : urgentTasks.length ? "Attention" : "On track";
    const firstOpenTask = openTasks[0] || null;
    const firstTaskId = firstOpenTask ? escapeHtml(String(firstOpenTask.id || firstOpenTask.taskId || firstOpenTask.createdAtUtc || firstOpenTask.title || "")) : "";
    const firstAppointmentId = activeAppointment ? escapeHtml(String(activeAppointment.id || activeAppointment.appointmentId || activeAppointment.createdAtUtc || activeAppointment.date || "")) : "";
    let workChipLabel = "Open Work";
    let workChipValue = `${openTasks.length} tasks`;
    let visitChipLabel = "Visits";
    let visitChipValue = activeAppointment ? "Active booking" : "No active visit";
    let pressureChipLabel = "Pressure";
    let pressureChipValue = pressureLabel;
    let workChipTone = openTasks.length ? "warn" : "good";
    let visitChipTone = activeAppointment ? "info" : "good";
    let workChipAction = firstTaskId ? `openCustomer360FocusedArtifact('tasks','${firstTaskId}','${escapeHtml(String(currentDepartmentLens || "home"))}')` : `setCustomer360ComposerMode('task')`;
    let visitChipAction = firstAppointmentId ? `openCustomer360FocusedArtifact('appointments','${firstAppointmentId}','${escapeHtml(String(currentDepartmentLens || "home"))}')` : `startDepartmentAppointmentCreate()`;
    let pressureChipAction = firstTaskId ? `openCustomer360FocusedArtifact('tasks','${firstTaskId}','${escapeHtml(String(currentDepartmentLens || "home"))}')` : `setCustomer360ComposerMode('${escapeHtml(String(getDepartmentLensConfig().composerMode || "task"))}')`;

    if (currentDepartmentLens === "service") {
      workChipLabel = "Lane Tasks";
      workChipValue = serviceTasks.length ? `${serviceTasks.length} active steps` : "Service queue clear";
      visitChipLabel = "Arrival";
      visitChipValue = activeAppointment ? `${activeAppointment.service || "Service visit"}` : "No booked arrival";
      pressureChipLabel = "Promised Time";
      pressureChipValue = overdueTasks.length ? "At risk" : activeAppointment ? "Locked" : "Needs booking";
      workChipTone = serviceTasks.length ? "warn" : "good";
      visitChipTone = activeAppointment ? "info" : "warn";
      workChipAction = serviceTasks[0]
        ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(serviceTasks[0].id || serviceTasks[0].taskId || serviceTasks[0].createdAtUtc || serviceTasks[0].title || ""))}','service')`
        : `setDepartmentLens('service')`;
      visitChipAction = activeAppointment
        ? `openCustomer360FocusedArtifact('appointments','${firstAppointmentId}','service')`
        : "startServiceWriteUp()";
      pressureChipAction = loanerTask
        ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(loanerTask.id || loanerTask.taskId || loanerTask.createdAtUtc || loanerTask.title || ""))}','service')`
        : activeAppointment
          ? `openCustomer360FocusedArtifact('appointments','${firstAppointmentId}','service')`
          : "startServiceWriteUp()";
    } else if (currentDepartmentLens === "bdc") {
      workChipLabel = "Callback Queue";
      workChipValue = bdcTasks.length ? `${bdcTasks.length} callbacks live` : "Queue clear";
      visitChipLabel = "Visit Intent";
      visitChipValue = activeAppointment ? "Commitment captured" : "No commitment yet";
      pressureChipLabel = "Reply SLA";
      pressureChipValue = missedCall ? "Rescue now" : pressureLabel;
      workChipTone = bdcTasks.length ? "warn" : "good";
      visitChipTone = activeAppointment ? "good" : "info";
      workChipAction = bdcTasks[0]
        ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(bdcTasks[0].id || bdcTasks[0].taskId || bdcTasks[0].createdAtUtc || bdcTasks[0].title || ""))}','bdc')`
        : "startBdcCallbackTask()";
      visitChipAction = activeAppointment
        ? `openCustomer360FocusedArtifact('appointments','${firstAppointmentId}','bdc')`
        : "startDepartmentAppointmentCreate()";
      pressureChipAction = missedCall
        ? `openCustomer360FocusedArtifact('calls','${escapeHtml(String(missedCall.id || missedCall.callId || missedCall.createdAtUtc || missedCall.from || ""))}','bdc')`
        : workChipAction;
    } else if (currentDepartmentLens === "sales") {
      workChipLabel = "Deal Queue";
      workChipValue = salesTasks.length ? `${salesTasks.length} deal steps live` : "No open deal";
      visitChipLabel = "Showroom";
      visitChipValue = activeAppointment ? "Visit scheduled" : "No drive booked";
      pressureChipLabel = "Desk Pressure";
      pressureChipValue = overdueTasks.length ? "Desk risk" : activeAppointment ? "Moving" : pressureLabel;
      workChipTone = salesTasks.length ? "warn" : "good";
      visitChipTone = activeAppointment ? "info" : "warn";
      workChipAction = salesTasks[0]
        ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(salesTasks[0].id || salesTasks[0].taskId || salesTasks[0].createdAtUtc || salesTasks[0].title || ""))}','sales')`
        : "startSalesDealTask()";
      visitChipAction = activeAppointment
        ? `openCustomer360FocusedArtifact('appointments','${firstAppointmentId}','sales')`
        : `startDepartmentAppointmentCreate()`;
      pressureChipAction = workChipAction;
    } else if (currentDepartmentLens === "accounting") {
      workChipLabel = "Invoice Queue";
      workChipValue = accountingTasks.length ? `${accountingTasks.length} reviews open` : "No pending review";
      visitChipLabel = "Payment Rail";
      visitChipValue = accountingTasks.length ? "Collection / statement active" : "Clear";
      pressureChipLabel = "Back Office";
      pressureChipValue = overdueTasks.length ? "Aging risk" : accountingTasks.length ? "Review active" : pressureLabel;
      workChipTone = accountingTasks.length ? "warn" : "good";
      visitChipTone = accountingTasks.length ? "info" : "good";
      workChipAction = accountingTasks[0]
        ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(accountingTasks[0].id || accountingTasks[0].taskId || accountingTasks[0].createdAtUtc || accountingTasks[0].title || ""))}','accounting')`
        : "queueAccountingInvoiceReview()";
      visitChipAction = accountingTasks[0]
        ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(accountingTasks[0].id || accountingTasks[0].taskId || accountingTasks[0].createdAtUtc || accountingTasks[0].title || ""))}','accounting')`
        : "startLedgerNote()";
      pressureChipAction = workChipAction;
    }
    opsStripEl.innerHTML = `
      <button class="customer360-ops-chip ${workChipTone}" onclick="${workChipAction}">
        <small>${escapeHtml(workChipLabel)}</small>
        <strong>${escapeHtml(workChipValue)}</strong>
      </button>
      <button class="customer360-ops-chip ${visitChipTone}" onclick="${visitChipAction}">
        <small>${escapeHtml(visitChipLabel)}</small>
        <strong>${escapeHtml(visitChipValue)}</strong>
      </button>
      <button class="customer360-ops-chip ${pressureTone}" onclick="${pressureChipAction}">
        <small>${escapeHtml(pressureChipLabel)}</small>
        <strong>${escapeHtml(pressureChipValue)}</strong>
      </button>
    `;
  }

  if (managerQueueEl) {
    const serviceTasks = openTasks.filter((task) => {
      const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return haystack.includes("[service]") || haystack.includes("advisor") || haystack.includes("loaner") || haystack.includes("transport");
    });
    const bdcTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[bdc]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("callback"));
    const salesTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[sales]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("quote") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("deal"));
    const accountingTasks = openTasks.filter((task) => `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("[accounting]") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("invoice") || `${task.title || ""} ${task.description || ""}`.toLowerCase().includes("ledger"));
    const overdueServiceTask = serviceTasks.find((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
    const overdueBdcTask = bdcTasks.find((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
    const overdueSalesTask = salesTasks.find((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
    const overdueAccountingTask = accountingTasks.find((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger");
    const missedCall = calls.find((call) => String(call.status || "").toLowerCase().includes("miss")) || null;
    const loanerTask = serviceTasks.find((task) => {
      const haystack = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return haystack.includes("loaner") || haystack.includes("transport");
    }) || null;
    const managerPressureTone = overdueTasks.length ? "danger" : urgentTasks.length ? "warn" : "good";
    const queueHeadline = overdueTasks.length
      ? `${overdueTasks.length} blocked handoff${overdueTasks.length === 1 ? "" : "s"}`
      : urgentTasks.length
        ? `${urgentTasks.length} item${urgentTasks.length === 1 ? "" : "s"} need attention`
        : "Queues moving cleanly";
    const queueCopy = overdueTasks.length
      ? "Manager view is highlighting overdue work first so the next stuck lane is easy to open."
      : urgentTasks.length
        ? "Attention items are live across the operating lanes below."
        : "Cross-department queues are balanced right now.";
    const serviceTopTask = overdueServiceTask || loanerTask || serviceTasks[0] || appointments[0] || null;
    const bdcTopTask = missedCall || overdueBdcTask || bdcTasks[0] || null;
    const salesTopTask = overdueSalesTask || salesTasks[0] || appointments[0] || null;
    const accountingTopTask = overdueAccountingTask || accountingTasks[0] || null;

    const managerCards = [
      {
        key: "service",
        label: "Service Advisor",
        headline: serviceTopTask ? (serviceTopTask.title || serviceTopTask.service || "Lane work active") : "Lane queue clear",
        copy: serviceTopTask ? "Promised time, transport, and advisor follow-up are tied to the same service lane queue." : "No active advisor queue items right now.",
        priorityReason: overdueServiceTask ? "Overdue advisor step" : loanerTask ? "Loaner or transport active" : serviceTasks[0] ? "Newest advisor task" : appointments[0] ? "Arrival already booked" : "",
        freshness: getManagerQueueFreshnessLabel(serviceTopTask?.updatedAtUtc || serviceTopTask?.dueAtUtc || serviceTopTask?.createdAtUtc || serviceTopTask?.date, "Promised time moved"),
        freshnessAt: serviceTopTask?.updatedAtUtc || serviceTopTask?.dueAtUtc || serviceTopTask?.createdAtUtc || serviceTopTask?.date || "",
        tone: serviceTasks.length ? (serviceTasks.some((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger") ? "danger" : "warn") : appointments.length ? "info" : "good",
        countLabel: `${serviceTasks.length} open`,
        ownerLabel: appointments[0]?.advisor ? `Owner ${appointments[0].advisor}` : "Advisor queue",
        action: serviceTopTask ? (serviceTopTask.service ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(serviceTopTask.id || serviceTopTask.appointmentId || serviceTopTask.createdAtUtc || serviceTopTask.date || ""))}','service')` : `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(serviceTopTask.id || serviceTopTask.taskId || serviceTopTask.createdAtUtc || serviceTopTask.title || ""))}','service')`) : "setDepartmentLens('service')"
      },
      {
        key: "bdc",
        label: "BDC",
        headline: bdcTopTask ? (bdcTopTask.title || (bdcTopTask.from ? `Missed call from ${bdcTopTask.from}` : "Callback queue active")) : "Callback queue clear",
        copy: bdcTopTask ? "Missed calls, callbacks, and reply SLA are visible from one manager surface." : "No BDC rescue or callback tasks open right now.",
        priorityReason: missedCall ? "Missed call requires rescue" : overdueBdcTask ? "Callback SLA overdue" : bdcTasks[0] ? "Active callback queue" : "",
        freshness: getManagerQueueFreshnessLabel(bdcTopTask?.updatedAtUtc || bdcTopTask?.startedAt || bdcTopTask?.createdAtUtc || bdcTopTask?.dueAtUtc, "Last callback touch"),
        freshnessAt: bdcTopTask?.updatedAtUtc || bdcTopTask?.startedAt || bdcTopTask?.createdAtUtc || bdcTopTask?.dueAtUtc || "",
        tone: calls.some((call) => String(call.status || "").toLowerCase().includes("miss")) ? "danger" : bdcTasks.length ? "warn" : "good",
        countLabel: `${bdcTasks.length} callbacks`,
        ownerLabel: "BDC queue",
        action: bdcTopTask ? (bdcTopTask.from ? `openCustomer360FocusedArtifact('calls','${escapeHtml(String(bdcTopTask.id || bdcTopTask.callId || bdcTopTask.createdAtUtc || bdcTopTask.from || ""))}','bdc')` : `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(bdcTopTask.id || bdcTopTask.taskId || bdcTopTask.createdAtUtc || bdcTopTask.title || ""))}','bdc')`) : "setDepartmentLens('bdc')"
      },
      {
        key: "sales",
        label: "Sales",
        headline: salesTopTask ? (salesTopTask.title || salesTopTask.service || "Deal pressure active") : "Deal desk clear",
        copy: salesTopTask ? "Deals, showroom commitments, and desk risk stay visible from the same customer record." : "No sales desk items are currently open.",
        priorityReason: overdueSalesTask ? "Deal step overdue" : salesTasks[0] ? "Desk action in motion" : appointments[0] ? "Showroom visit queued" : "",
        freshness: getManagerQueueFreshnessLabel(salesTopTask?.updatedAtUtc || salesTopTask?.dueAtUtc || salesTopTask?.createdAtUtc || salesTopTask?.date, "Deal desk moved"),
        freshnessAt: salesTopTask?.updatedAtUtc || salesTopTask?.dueAtUtc || salesTopTask?.createdAtUtc || salesTopTask?.date || "",
        tone: salesTasks.some((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger") ? "danger" : salesTasks.length || appointments.length ? "warn" : "good",
        countLabel: `${salesTasks.length} deal steps`,
        ownerLabel: appointments[0] ? "Visit queued" : "Sales queue",
        action: salesTopTask ? (salesTopTask.service ? `openCustomer360FocusedArtifact('appointments','${escapeHtml(String(salesTopTask.id || salesTopTask.appointmentId || salesTopTask.createdAtUtc || salesTopTask.date || ""))}','sales')` : `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(salesTopTask.id || salesTopTask.taskId || salesTopTask.createdAtUtc || salesTopTask.title || ""))}','sales')`) : "setDepartmentLens('sales')"
      },
      {
        key: "accounting",
        label: "Accounting",
        headline: accountingTopTask ? (accountingTopTask.title || "Invoice review active") : "Back office clear",
        copy: accountingTopTask ? "Invoice review, statement aging, and ledger follow-up are surfaced in one accounting queue." : "No accounting review items are open right now.",
        priorityReason: overdueAccountingTask ? "Invoice aging risk" : accountingTasks[0] ? "Review queue active" : "",
        freshness: getManagerQueueFreshnessLabel(accountingTopTask?.updatedAtUtc || accountingTopTask?.dueAtUtc || accountingTopTask?.createdAtUtc, "Review last touched"),
        freshnessAt: accountingTopTask?.updatedAtUtc || accountingTopTask?.dueAtUtc || accountingTopTask?.createdAtUtc || "",
        tone: accountingTasks.some((task) => getJourneyArtifactSla(task.dueAtUtc || task.updatedAtUtc || task.createdAtUtc).tone === "danger") ? "danger" : accountingTasks.length ? "warn" : "good",
        countLabel: `${accountingTasks.length} reviews`,
        ownerLabel: "Accounting queue",
        action: accountingTopTask ? `openCustomer360FocusedArtifact('tasks','${escapeHtml(String(accountingTopTask.id || accountingTopTask.taskId || accountingTopTask.createdAtUtc || accountingTopTask.title || ""))}','accounting')` : "setDepartmentLens('accounting')"
      }
    ];
    const focusedManagerLens = ["service", "bdc", "sales", "accounting"].includes(String(currentDepartmentLens || "").toLowerCase())
      ? String(currentDepartmentLens || "").toLowerCase()
      : "";
    const sortedManagerCards = managerCards.slice().sort((left, right) => {
      if (currentManagerQueueSort === "recent") {
        return getManagerQueueSortTimestamp(right.freshnessAt) - getManagerQueueSortTimestamp(left.freshnessAt);
      }
      if (currentManagerQueueSort === "stale") {
        return getManagerQueueSortTimestamp(left.freshnessAt) - getManagerQueueSortTimestamp(right.freshnessAt);
      }
      return getManagerQueueUrgencyRank(right) - getManagerQueueUrgencyRank(left);
    });
    const visibleManagerCards = focusedManagerLens
      ? sortedManagerCards.filter((card) => card.key === focusedManagerLens).map((card) => ({ ...card, focused: true }))
      : sortedManagerCards;
    const managerTitle = focusedManagerLens ? `${titleCase(focusedManagerLens)} Queue` : "Manager Queue";
    const managerSubtitle = focusedManagerLens
      ? `Focused ${titleCase(focusedManagerLens)} view with the live queue, owner posture, and next actionable item.`
      : `${queueHeadline}. ${queueCopy}`;
    const managerSortCopy = getManagerQueueSortCopy(currentManagerQueueSort, visibleManagerCards.length);

    managerQueueEl.innerHTML = `
      <div class="customer360-manager-head">
        <div>
          <h3>${escapeHtml(managerTitle)}</h3>
          <span>${escapeHtml(managerSubtitle)}</span>
        </div>
        <div class="customer360-manager-tools">
          <div class="customer360-manager-strip">
            <span class="customer360-manager-pill ${managerPressureTone}">${escapeHtml(overdueTasks.length ? `${overdueTasks.length} overdue` : urgentTasks.length ? `${urgentTasks.length} at risk` : "On track")}</span>
            <span class="customer360-manager-pill info">${escapeHtml(`${openTasks.length} open work items`)}</span>
            <span class="customer360-manager-pill good">${escapeHtml(`${appointments.length} visits`)}</span>
          </div>
          ${focusedManagerLens ? "" : `
            <div>
              <div class="customer360-manager-sort">
                <button type="button" class="${currentManagerQueueSort === "urgent" ? "active" : ""}" onclick="setCustomer360ManagerQueueSort('urgent')">Most urgent</button>
                <button type="button" class="${currentManagerQueueSort === "recent" ? "active" : ""}" onclick="setCustomer360ManagerQueueSort('recent')">Recently moved</button>
                <button type="button" class="${currentManagerQueueSort === "stale" ? "active" : ""}" onclick="setCustomer360ManagerQueueSort('stale')">Least touched</button>
              </div>
              <span class="customer360-manager-sort-copy">${escapeHtml(managerSortCopy)}</span>
            </div>
          `}
        </div>
      </div>
      <div class="customer360-manager-grid ${focusedManagerLens ? "focused" : ""}">
        ${visibleManagerCards.map((card) => buildManagerQueueCard(card)).join("")}
      </div>
    `;
  }

  if (roBoardEl) {
    roBoardEl.innerHTML = buildRepairOrderBoardMarkup(getSelectedCustomerRepairOrders());
  }

  if (departmentHubEl) {
    departmentHubEl.className = `customer360-department-hub ${currentDepartmentLens === "home" ? "is-home" : "is-workspace"}`;
    departmentHubEl.innerHTML = buildRoleWorkspaceToolsMarkup(customer, vehicle, tasks, appointments, calls);
  }

  if (departmentDashboardEl) {
    departmentDashboardEl.className = `customer360-department-dashboard ${escapeHtml(String(currentDepartmentLens || "home"))}`;
    departmentDashboardEl.innerHTML = buildDepartmentDashboardMarkup(customer, vehicle, tasks, appointments, calls);
  }

  if (roleToolsEl) {
    roleToolsEl.innerHTML = buildRoleWorkspaceToolsMarkup(customer, vehicle, tasks, appointments, calls);
  }

  if (summaryTitleEl) {
    summaryTitleEl.textContent = `${getDepartmentLensConfig().summaryTitle || "AI Summary"}: ${customerDisplayName(customer)}`;
  }

  if (customerCardEl) {
    if (currentDepartmentLens === "home") {
      const phones = (customer.phones || []).slice(0, 2);
      const primaryPhone = phones[0] ? normalizePhoneNumber(phones[0]) : "";
      const secondaryPhone = phones[1] ? normalizePhoneNumber(phones[1]) : "";
      customerCardEl.innerHTML = `
        <div class="customer360-customer-top">
          <div class="customer360-avatar"></div>
          <div>
            <div class="customer360-profile-name">${escapeHtml(customerDisplayName(customer))}</div>
            <div class="customer360-profile-lines">
              ${primaryPhone ? escapeHtml(formatPhonePretty(primaryPhone)) : "No primary phone"}<br />
              ${customer.email ? escapeHtml(customer.email) : "No email on file"}
            </div>
          </div>
        </div>
        <div class="customer360-action-row">
          ${primaryPhone ? `<a href="#" class="customer360-action-chip phone-link" data-phone="${escapeHtml(primaryPhone)}" data-mode="call">✓ Call</a>` : `<span class="customer360-action-chip">✓ Call</span>`}
          ${primaryPhone ? `<a href="#" class="customer360-action-chip secondary phone-link" data-phone="${escapeHtml(primaryPhone)}" data-mode="sms">✉ Text</a>` : `<span class="customer360-action-chip secondary">✉ Text</span>`}
          <a href="${customer.email ? `mailto:${encodeURIComponent(customer.email)}` : "#"}" class="customer360-action-chip secondary">✉ Email</a>
        </div>
        <div class="customer360-tag-row">
          <span class="customer360-tag">High Value</span>
          <span class="customer360-tag">Warranty Inquiry</span>
          <span class="customer360-tag">${escapeHtml(customer.preferredLanguage || "English")}</span>
          ${secondaryPhone ? `<span class="customer360-tag">${escapeHtml(formatPhonePretty(secondaryPhone))}</span>` : ""}
        </div>
      `;
    } else {
      customerCardEl.innerHTML = buildDepartmentRecordStripMarkup(customer, vehicle, tasks, appointments);
    }
  }

  if (aiSummaryEl) {
    const lens = getDepartmentLensConfig();
    aiSummaryEl.textContent = `${lens.name}: ${aiSummary}`;
  }
  if (summaryActionsEl) {
    const summaryActions = buildCustomerSummaryActions({
      tasks: openTasks,
      appointments,
      calls,
      notes: currentCustomerNotes
    });
    summaryActionsEl.innerHTML = summaryActions.map((item) => `
      <button type="button" class="customer360-summary-action ${item.secondary ? "secondary" : ""}" onclick="${item.action}">
        ${escapeHtml(item.label)}
      </button>
    `).join("");
  }

  renderCustomer360Journey(openTasks, currentCustomerNotes, appointments);

  if (vehicleTitleEl) {
    vehicleTitleEl.textContent = vehicle ? vehicleDisplayName(vehicle) : "No linked vehicle";
  }

  if (vehicleRailEl) {
    vehicleRailEl.innerHTML = vehicle ? `
      <div class="customer360-vehicle-kpis">
        <div class="customer360-vehicle-kpi">
          <small>Mileage</small>
          <strong>${escapeHtml(vehicle.mileage ?? "-")} mi</strong>
        </div>
        <div class="customer360-vehicle-kpi">
          <small>Archive</small>
          <strong>${archiveCount} items</strong>
        </div>
      </div>
      <div class="customer360-vehicle-badges">
        <span class="customer360-status-pill good">Battery ${escapeHtml(batteryState)}</span>
        <span class="customer360-status-pill ${String(recallState).toLowerCase().includes("0") ? "good" : "warn"}">${escapeHtml(recallState)}</span>
        <span class="customer360-status-pill info">${escapeHtml(inferVehicleGeoLabel(vehicle, customer))}</span>
      </div>
      <div class="customer360-vehicle-kpis" style="margin-top:12px;">
        <div class="customer360-vehicle-kpi" style="cursor:pointer;" onclick="openVehicleOpsContext('signals')">
          <small>Recent Signals</small>
          <strong>${vehicleSignalCount}</strong>
        </div>
        <div class="customer360-vehicle-kpi" style="cursor:pointer;" onclick="openVehicleOpsContext('archive')">
          <small>Archive Updates</small>
          <strong>${archiveSignalCount + vinMediaAssets.length}</strong>
        </div>
        <div class="customer360-vehicle-kpi" style="cursor:pointer;" onclick="openVehicleOpsContext('evidence-tasks')">
          <small>Open Evidence Tasks</small>
          <strong>${archiveFollowUpCount}</strong>
        </div>
        <div class="customer360-vehicle-kpi">
          <small>Last Updated</small>
          <strong>${escapeHtml(vehicleOpsFreshness)}</strong>
        </div>
      </div>
      <div class="customer360-geo-card" style="margin-top:10px;">
        <strong>VIN Journey</strong>
        <span>${escapeHtml(vehicleJourney.percent)}% active • Current: ${escapeHtml(vehicleJourney.current.label)}</span>
        <div class="customer360-journey-progress" style="margin-top:10px;margin-bottom:0;">
          <div class="customer360-journey-progress-bar">
            <div class="customer360-journey-progress-fill" style="width:${Math.max(8, Math.min(vehicleJourney.percent, 100))}%"></div>
          </div>
        </div>
        <div class="customer360-journey-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:10px;">
          ${vehicleJourney.stages.map((stage) => `
            <div class="customer360-journey-stage ${stage.active ? "active" : "upcoming"}" style="padding:10px;cursor:pointer;" onclick="openVehicleJourneyStage('${escapeHtml(stage.key)}')">
              <div class="customer360-journey-stage-top">
                <b>${escapeHtml(stage.label)}</b>
                <span class="customer360-status-pill ${stage.active ? "warn" : "info"}">${stage.active ? "Live" : "Queued"}</span>
              </div>
              <span>${escapeHtml(stage.detail)}</span>
            </div>
          `).join("")}
        </div>
        <div class="customer360-journey-next" style="margin-top:10px;padding:10px 12px;">
          <div class="customer360-journey-next-copy">
            <small>VIN Next Best Action</small>
            <strong>${escapeHtml(vehicleJourneyNext.title)}</strong>
            <span>${escapeHtml(vehicleJourneyNext.detail)}</span>
          </div>
          <button type="button" class="customer360-journey-next-btn" onclick="openVehicleJourneyStage('${escapeHtml(vehicleJourneyNext.stageKey || "health")}')">${escapeHtml(vehicleJourneyNext.label)}</button>
        </div>
      </div>
      <div class="customer360-vehicle-line"><span>VIN:</span><strong>${escapeHtml(vehicle.vin || "Unknown")}</strong></div>
      <div class="customer360-vehicle-line" style="cursor:pointer;" onclick="openVehicleRailAction('geo')"><span>Geo:</span><strong>${escapeHtml(vehicle.status || "Inventory Live")}</strong></div>
      <div class="customer360-vehicle-line"><span>Battery Health:</span><strong class="customer360-vehicle-good">${escapeHtml(batteryState)}</strong></div>
      <div class="customer360-vehicle-line"><span>Recalls:</span><strong>${escapeHtml(recallState)}</strong></div>
      <div class="customer360-vehicle-line"><span>Maintenance:</span><strong class="customer360-vehicle-warn">${escapeHtml(maintenanceState === "Scheduled" ? "Due Soon" : maintenanceState)}</strong></div>
      <div class="customer360-vehicle-line" style="cursor:pointer;" onclick="openVehicleRailAction('loaner')"><span>Loaner:</span><strong>${appointments.length ? "Potentially needed" : "Not requested"}</strong></div>
      <div class="customer360-geo-card" style="cursor:pointer;" onclick="openVehicleRailAction('geo')">
        <strong>${escapeHtml(inferVehicleGeoLabel(vehicle, customer))}</strong>
        <span>Geo-enabled inventory anchor for ${escapeHtml(vehicleDisplayName(vehicle))} tied to the VIN archive, service lane, and technician dispatch flow.</span>
      </div>
      ${latestVehiclePresentation ? `
        <div class="customer360-geo-card" style="cursor:pointer;" onclick="openCustomer360FocusedArtifact('notes','${escapeHtml(String(latestVehicleArtifact?.id || ""))}','home')">
          <strong>Latest Health Event</strong>
          <span>${escapeHtml(latestVehiclePresentation.body.split("\n")[0] || "Vehicle health logged.")}</span>
        </div>
      ` : ""}
      ${latestArchivePresentation ? `
        <div class="customer360-geo-card" style="cursor:pointer;" onclick="${latestArchiveArtifact?.id ? `openCustomer360FocusedArtifact('notes','${escapeHtml(String(latestArchiveArtifact?.id || ""))}','home')` : latestArchiveMedia?.storageUrl ? `window.open('${escapeHtml(String(latestArchiveMedia.storageUrl || ""))}','_blank')` : ""}">
          <strong>Latest VIN Archive Entry</strong>
          <span>${escapeHtml(latestArchivePresentation.body.split("\n")[0] || "VIN archive updated.")}</span>
        </div>
      ` : ""}
      <div class="customer360-vehicle-actions">
        <button class="customer360-toolbar-btn" style="width:100%;" onclick="startVehicleHealthEventNote()">Log Health Event</button>
        <button class="customer360-toolbar-btn" style="width:100%;" onclick="startLoanerTask()">Create Loaner Task</button>
        <button class="customer360-toolbar-btn secondary" style="width:100%;" onclick="captureTechnicianMedia('vin_archive','photo')">Add VIN Archive Media</button>
      </div>
    ` : `<div class="customer360-empty">Vehicle status will appear here.</div>`;
  }

  if (archiveCountEl) {
    archiveCountEl.textContent = `${archiveCount} Items`;
  }

  if (lensPanelEl) {
    lensPanelEl.innerHTML = buildLensPanelMarkup(customer, vehicle, openTasks, currentCustomerNotes, appointments, calls);
  }

  if (tasksBoardEl) {
    const lensDepartment = normalizeDepartmentKey(currentDepartmentLens);
    const selectedOwner = customer360TaskQueueOwners[lensDepartment] || "";
    const departmentTasks = ["service", "bdc", "sales", "technicians", "fi", "parts", "accounting"].includes(lensDepartment)
      ? openTasks.filter((task) => {
          const taskDepartment = getTaskAssignedDepartment(task);
          const departmentMatches = taskDepartment ? taskDepartment === lensDepartment : true;
          const ownerMatches = selectedOwner ? getTaskAssignedUser(task) === selectedOwner : true;
          return departmentMatches && ownerMatches;
        })
      : openTasks;
    if (currentDepartmentLens === "service") {
      tasksBoardEl.innerHTML = buildDepartmentTaskQueueToolbar("service", departmentTasks) + buildServiceAdvisorTasksMarkup(departmentTasks, appointments, vehicle);
    } else if (currentDepartmentLens === "technicians") {
      tasksBoardEl.innerHTML = buildDepartmentTaskQueueToolbar("technicians", departmentTasks) + buildTechnicianTasksMarkup(departmentTasks, vehicle);
    } else if (currentDepartmentLens === "parts") {
      tasksBoardEl.innerHTML = buildDepartmentTaskQueueToolbar("parts", departmentTasks) + buildPartsTasksMarkup(departmentTasks, appointments, vehicle);
    } else if (currentDepartmentLens === "accounting") {
      tasksBoardEl.innerHTML = buildDepartmentTaskQueueToolbar("accounting", departmentTasks) + buildAccountingTasksMarkup(departmentTasks, vehicle);
    } else if (currentDepartmentLens === "bdc" || currentDepartmentLens === "sales" || currentDepartmentLens === "fi") {
      const lensTasks = departmentTasks.slice(0, 3);
      const emptyTaskCopy = currentDepartmentLens === "bdc"
        ? "No BDC follow-ups queued yet."
        : currentDepartmentLens === "sales"
        ? "No deal tasks linked yet."
        : "No F&I tasks linked yet.";
      tasksBoardEl.innerHTML = buildDepartmentTaskQueueToolbar(currentDepartmentLens, departmentTasks) + (lensTasks.length ? lensTasks.map((task) => `
        <div class="customer360-panel-item">
          <div class="customer360-panel-item-body">
            <span>${escapeHtml(task.title || "Task")}</span>
            <div class="customer360-meta">${escapeHtml((task.assignedUser ? `${task.assignedUser} • ` : "") + (task.description || "Open task"))}</div>
            ${buildTaskAssignmentControls(task, currentDepartmentLens)}
          </div>
          <button class="customer360-panel-action" onclick="openCustomer360FocusedArtifact('tasks','${escapeHtml(String(task.id || task.taskId || task.createdAtUtc || task.title || ""))}','${escapeHtml(String(currentDepartmentLens || "home"))}')">Open</button>
        </div>
      `).join("") : `<div class="customer360-empty">${emptyTaskCopy}</div>`);
    } else {
    const lensTasks = currentDepartmentLens === "sales"
      ? [...openTasks, ...tasks.filter((task) => String(task.status || "").toLowerCase() === "completed")].slice(0, 3)
      : openTasks.slice(0, 3);
    const emptyTaskCopy = currentDepartmentLens === "bdc"
      ? "No BDC follow-ups queued yet."
      : currentDepartmentLens === "sales"
      ? "No deal tasks linked yet."
      : "No tasks linked yet.";
    tasksBoardEl.innerHTML = lensTasks.length ? lensTasks.map((task) => `
      <div class="customer360-panel-item">
        <span>${escapeHtml(task.title || "Task")}</span>
        <button class="customer360-panel-action" onclick="openCustomer360FocusedArtifact('tasks','${escapeHtml(String(task.id || task.taskId || task.createdAtUtc || task.title || ""))}','${escapeHtml(String(currentDepartmentLens || "home"))}')">Open</button>
      </div>
    `).join("") : `<div class="customer360-empty">${emptyTaskCopy}</div>`;
    }
  }

  if (notesBoardEl) {
    if (currentDepartmentLens === "service") {
      notesBoardEl.innerHTML = buildServiceAdvisorNotesMarkup(currentCustomerNotes, appointments);
    } else if (currentDepartmentLens === "technicians") {
      notesBoardEl.innerHTML = buildTechnicianNotesMarkup(currentCustomerNotes, calls);
    } else if (currentDepartmentLens === "parts") {
      notesBoardEl.innerHTML = buildPartsNotesMarkup(currentCustomerNotes, appointments);
    } else if (currentDepartmentLens === "accounting") {
      notesBoardEl.innerHTML = buildAccountingNotesMarkup(currentCustomerNotes);
    } else {
    const noteEmptyCopy = currentDepartmentLens === "sales"
      ? "No deal notes captured yet."
      : currentDepartmentLens === "bdc"
      ? "No conversation notes captured yet."
      : "No notes captured yet.";
    notesBoardEl.innerHTML = currentCustomerNotes.length ? currentCustomerNotes.slice(0, 2).map((note) => `
      <div class="customer360-panel-item">
        <span>${escapeHtml((note.body || "").slice(0, 60) || "Internal note")}</span>
        <button class="customer360-panel-action" onclick="openCustomer360FocusedArtifact('notes','${escapeHtml(String(note.id || note.noteId || note.createdAtUtc || note.body || ""))}','${escapeHtml(String(currentDepartmentLens || "home"))}')">Open</button>
      </div>
    `).join("") : `<div class="customer360-empty">${noteEmptyCopy}</div>`;
    }
  }

  if (serviceLaneEl) {
    const topTask = openTasks[0];
    serviceLaneEl.innerHTML = buildLensServiceLaneMarkup(customer, vehicle, topTask, appointments, calls);
  }

  if (filesPanelEl) {
    const archiveItems = buildLensArchiveItems(vehicle, customer, calls, currentCustomerNotes, appointments);
      const liveArchiveItems = [
      latestArchivePresentation ? {
        icon: "🗂",
        title: "Latest VIN Entry",
        meta: `${(latestArchivePresentation.body.split("\n")[0] || "VIN archive updated.").slice(0, 72)}`,
        sourceId: latestArchiveArtifact?.id || latestArchiveMedia?.storageUrl || "",
        kind: latestArchiveArtifact?.id ? "notes" : "media",
        lens: "home"
      } : null,
      latestVehiclePresentation ? {
        icon: "🩺",
        title: "Latest Health Event",
        meta: `${(latestVehiclePresentation.body.split("\n")[0] || "Vehicle health event recorded.").slice(0, 72)}`,
        sourceId: latestVehicleArtifact?.id || "",
        kind: "notes",
        lens: "home"
      } : null,
      ...vinMediaAssets.slice(0, 2).map((asset) => ({
        icon: getMediaAssetKind(asset) === "video" ? "🎥" : "📸",
        title: asset.fileName || titleCase(getMediaAssetKind(asset)),
        meta: `${asset.caption || "VIN archive evidence"} • ${formatDisplayDateTime(asset.capturedAtUtc || asset.createdAtUtc)}`,
        sourceId: asset.storageUrl || "",
        kind: "media",
        lens: "home"
      })),
      ...archiveItems
    ].filter(Boolean).slice(0, 5);
    filesPanelEl.innerHTML = `
      <div class="customer360-panel-item" style="border-top:none;padding-top:0;">
        <span>${escapeHtml(vehicle?.vin || "VIN pending")}</span>
        <span class="customer360-contact-pill">${archiveCount} files</span>
      </div>
      <div class="customer360-archive-actions">
        <button class="customer360-toolbar-btn" style="width:100%;" onclick="captureTechnicianMedia('vin_archive','photo')">Add Archive Media</button>
        <button class="customer360-toolbar-btn secondary" style="width:100%;" onclick="startVehicleHealthEventNote()">Log Vehicle Evidence</button>
      </div>
      <div class="customer360-archive-list">
        ${liveArchiveItems.map((item) => `
          <div class="customer360-archive-item" ${item.sourceId ? `style="cursor:pointer;" onclick="${item.kind === "media" ? `window.open('${escapeHtml(String(item.sourceId || ""))}','_blank')` : `openCustomer360FocusedArtifact('${escapeHtml(String(item.kind || "notes"))}','${escapeHtml(String(item.sourceId || ""))}','${escapeHtml(String(item.lens || "home"))}')`}"` : ""}>
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
              <div class="customer360-archive-icon">${item.icon}</div>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.meta)}</span>
              </div>
            </div>
            <span class="customer360-status-pill info">VIN</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  const timelineCards = [];

  if (calls[0]) {
    timelineCards.push({
      type: "Phone Call",
      eventType: "calls",
      sourceId: calls[0].id || calls[0].sid || calls[0].callSid || calls[0].startedAt || "call",
      time: formatDisplayDateTime(calls[0].startedAt || calls[0].updatedAt),
      body: calls[0].notes || calls[0].transcript || "Spoke with the customer about a recent vehicle concern.",
      subcopy: `${titleCase(calls[0].status || "completed")} • ${titleCase(calls[0].routedDepartment || "communications")}`
    });
  }

  const latestTimeline = currentCustomerTimeline.slice(0, 6).map((event) => {
    const eventType = String(event.eventType || "activity").toLowerCase();
    const isJourneyAssignment = eventType === "journey_assignment";
    const department = titleCase(event.department || event.sourceSystem || "ingrid");
    const tagged = getTaggedTimelinePresentation(
      event.body || "",
      titleCase(event.title || event.eventType || "Timeline Event"),
      department,
      event.eventType || ""
    );
    return {
      type: isJourneyAssignment ? "Ownership Change" : tagged.type,
      eventType: event.eventType || "activity",
      sourceId: event.id || event.timelineEventId || event.createdAtUtc || event.title || "timeline",
      time: formatDisplayDateTime(event.occurredAtUtc || event.createdAtUtc),
      body: isJourneyAssignment
        ? `${department} reassigned to ${event.body || "new owner"}.`
        : tagged.body || "Timeline detail captured.",
      subcopy: isJourneyAssignment
        ? `${department} • Journey assignment`
        : tagged.subcopy
    };
  });

  latestTimeline.forEach((event) => timelineCards.push(event));

  if (appointments[0]) {
    timelineCards.push({
      type: "Service Event",
      eventType: "appointments",
      sourceId: appointments[0].id || appointments[0].appointmentId || `${appointments[0].date || ""}-${appointments[0].time || ""}`,
      time: `${appointments[0].date || ""} ${appointments[0].time || ""}`.trim() || "Upcoming",
      body: `${appointments[0].service || "Service appointment"}${appointments[0].advisor ? ` with ${appointments[0].advisor}` : ""}`,
      actions: [
        { label: "Schedule Service", accent: true },
        { label: appointments[0].date && appointments[0].time ? `${appointments[0].date} ${appointments[0].time}` : "Tomorrow at 10:00 AM", light: true }
      ]
    });
  }

  if (openTasks[0]) {
    const taskHaystack = `${openTasks[0].title || ""} ${openTasks[0].description || ""}`.toLowerCase();
    const isLoanerTask = taskHaystack.includes("loaner") || taskHaystack.includes("transport");
    timelineCards.push({
      type: isLoanerTask ? "Loaner Coordination" : "Task",
      eventType: "tasks",
      sourceId: openTasks[0].id || openTasks[0].taskId || openTasks[0].createdAtUtc || openTasks[0].title || "task",
      time: formatDisplayDateTime(openTasks[0].updatedAtUtc || openTasks[0].createdAtUtc || new Date().toISOString()),
      body: openTasks[0].description || openTasks[0].title || "Follow up with the customer.",
      subcopy: isLoanerTask ? "Service transport" : `Follow Up: ${openTasks[0].title || "Customer confirmation"}`
    });
  }

  if (currentCustomerNotes[0]) {
    const tagged = getTaggedTimelinePresentation(
      currentCustomerNotes[0].body || "",
      "Note",
      titleCase(currentCustomerNotes[0].noteType || "internal"),
      ""
    );
    timelineCards.push({
      type: tagged.type,
      eventType: "notes",
      sourceId: currentCustomerNotes[0].id || currentCustomerNotes[0].noteId || currentCustomerNotes[0].createdAtUtc || currentCustomerNotes[0].body || "note",
      time: formatDisplayDateTime(currentCustomerNotes[0].updatedAtUtc || currentCustomerNotes[0].createdAtUtc),
      body: tagged.body || "Recent note captured in the customer record.",
      subcopy: tagged.subcopy
    });
  }

  if (!timelineCards.length) {
    timelineCards.push({
      type: "Timeline Event",
      eventType: "activity",
      time: "Now",
      body: "Live calls, SMS, voicemails, AI summaries, tasks, notes, appointments, and service events will appear here as they are captured.",
      subcopy: "INGRID timeline spine"
    });
  }

  currentCustomer360TimelineCards = timelineCards;
  renderCustomer360Timeline();
  if (timelineEl) timelineEl.dataset.customerId = customer.id;
  seedCustomer360ComposerDefaults();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatVehicle(row) {
  return [row.year, row.make, row.model].filter(Boolean).join(" ");
}

function normalizeDept(value) {
  return String(value || "").toLowerCase().trim();
}

function isBooked(call) {
  const notes = String(call.notes || "").toLowerCase();
  const transcript = String(call.transcript || "").toLowerCase();
  const status = String(call.status || "").toLowerCase();
  const intent = String(call.detectedIntent || "").toLowerCase();

  return (
    notes.includes("booked") ||
    notes.includes("appointment booked") ||
    notes.includes("rendez-vous pris") ||
    transcript.includes("appointment booked") ||
    transcript.includes("booked appointment") ||
    transcript.includes("rendez-vous pris") ||
    status === "booked" ||
    intent.includes("booked")
  );
}

function deptBadge(dept, booked = false) {
  if (booked) return `<span class="badge badge-booked">Booked</span>`;

  const d = normalizeDept(dept);
  if (d.includes("service")) return `<span class="badge badge-service">Service</span>`;
  if (d.includes("sales")) return `<span class="badge badge-sales">Sales</span>`;
  if (d.includes("parts")) return `<span class="badge badge-parts">Parts</span>`;
  if (d.includes("bdc")) return `<span class="badge badge-bdc">BDC</span>`;
  if (d.includes("sms")) return `<span class="badge badge-bdc">SMS</span>`;
  return escapeHtml(dept || "");
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".tab");
  const setPortalMode = (tabId) => {
    document.body.classList.toggle("customer360-landing", tabId === "customer360Tab");
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabs.forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");

      const tabId = btn.getAttribute("data-tab");
      const target = document.getElementById(tabId);
      if (target) target.classList.add("active");
      setPortalMode(tabId);
    });
  });

  const activeTab = document.querySelector(".tab-btn.active")?.getAttribute("data-tab") || "dashboardTab";
  setPortalMode(activeTab);
}

function initConfigPanels() {
  document.querySelectorAll(".config-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".config-nav-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".config-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.configPanel)?.classList.add("active");
    });
  });
}

function initKpiFilters() {
  document.querySelectorAll(".kpi-card").forEach((card) => {
    card.addEventListener("click", () => {
      activeDepartmentFilter = card.dataset.filter || "all";
      document.querySelectorAll(".kpi-card").forEach((c) => c.classList.remove("active-filter"));
      card.classList.add("active-filter");
      loadCalls();
    });
  });

  const allCard = document.querySelector('.kpi-card[data-filter="all"]');
  if (allCard) allCard.classList.add("active-filter");
}

function appendNoteLine(text) {
  const notesBox = document.getElementById("notesBox");
  if (!notesBox) return;
  const current = notesBox.value.trim();
  notesBox.value = current ? `${current}\n${text}` : text;
}

function wireTrainingButtons() {
  document.getElementById("btnBooked")?.addEventListener("click", () => appendNoteLine("Outcome: Booked appointment"));
  document.getElementById("btnWrongDept")?.addEventListener("click", () => {
    appendNoteLine("Routing issue: Wrong department");
    appendNoteLine("Correct Department: ");
  });
  document.getElementById("btnFaqLesson")?.addEventListener("click", () => appendNoteLine("FAQ Lesson: "));
  document.getElementById("btnCallback")?.addEventListener("click", () => appendNoteLine("Outcome: Callback requested"));
  document.getElementById("btnVip")?.addEventListener("click", () => appendNoteLine("Caller Type: VIP"));
  document.getElementById("btnEnglish")?.addEventListener("click", () => appendNoteLine("Language Preference: English"));
  document.getElementById("btnFrench")?.addEventListener("click", () => appendNoteLine("Language Preference: French"));
}

function filterCalls(calls) {
  const q = (document.getElementById("searchBox")?.value || "").toLowerCase().trim();
  const fromDate = document.getElementById("dateFrom")?.value || "";
  const toDate = document.getElementById("dateTo")?.value || "";

  return calls.filter((call) => {
    const haystack = [
      call.from,
      call.to,
      call.userName,
      call.userNumber,
      call.callSid,
      call.routedDepartment,
      call.detectedIntent,
      call.notes,
      call.transcript
    ].join(" ").toLowerCase();

    const matchesSearch = !q || haystack.includes(q);

const callDateRaw = call.startedAt || call.updatedAt || "";
const callDateObj = callDateRaw ? new Date(callDateRaw) : null;

const callDate =
  callDateObj && !isNaN(callDateObj.getTime())
    ? callDateObj.toISOString().slice(0, 10)
    : "";

const matchesFrom = !fromDate || (callDate && callDate >= fromDate);
const matchesTo = !toDate || (callDate && callDate <= toDate);

const dept = normalizeDept(call.routedDepartment);
const booked = isBooked(call);

let matchesDepartment = true;
if (activeDepartmentFilter === "service") matchesDepartment = dept.includes("service");
if (activeDepartmentFilter === "sales") matchesDepartment = dept.includes("sales");
if (activeDepartmentFilter === "parts") matchesDepartment = dept.includes("parts");
if (activeDepartmentFilter === "bdc") matchesDepartment = dept.includes("bdc");
if (activeDepartmentFilter === "booked") matchesDepartment = booked;

    return matchesSearch && matchesFrom && matchesTo && matchesDepartment;
  });
}

function updateKpis() {
  const calls = filterCalls(currentCalls || []);
  
  console.log("updateKpis currentCalls:", calls);

  const total = calls.length;

  const serviceCalls = calls.filter((c) =>
    String(c.routedDepartment || "").toLowerCase() === "service"
  );
  const salesCalls = calls.filter((c) =>
    String(c.routedDepartment || "").toLowerCase() === "sales"
  );
  const partsCalls = calls.filter((c) =>
    String(c.routedDepartment || "").toLowerCase() === "parts"
  );
  const bdcCalls = calls.filter((c) =>
    String(c.routedDepartment || "").toLowerCase() === "bdc"
  );

  const bookedCalls = calls.filter((c) => {
    const notes = String(c.notes || "").toLowerCase();
    const status = String(c.status || "").toLowerCase();
    return notes.includes("booked") || status.includes("booked");
  });

  const totalEl = document.getElementById("kpiTotal");
  const serviceEl = document.getElementById("kpiService");
  const salesEl = document.getElementById("kpiSales");
  const partsEl = document.getElementById("kpiParts");
  const bdcEl = document.getElementById("kpiBDC");
  const bookedEl = document.getElementById("kpiBooked");

  console.log("KPI elements found:", {
    totalEl: !!totalEl,
    serviceEl: !!serviceEl,
    salesEl: !!salesEl,
    partsEl: !!partsEl,
    bdcEl: !!bdcEl,
    bookedEl: !!bookedEl,
  });

  console.log("KPI counts:", {
    total,
    service: serviceCalls.length,
    sales: salesCalls.length,
    parts: partsCalls.length,
    bdc: bdcCalls.length,
    booked: bookedCalls.length,
  });

  if (totalEl) totalEl.textContent = String(total);
  if (serviceEl) serviceEl.textContent = String(serviceCalls.length);
  if (salesEl) salesEl.textContent = String(salesCalls.length);
  if (partsEl) partsEl.textContent = String(partsCalls.length);
  if (bdcEl) bdcEl.textContent = String(bdcCalls.length);
  if (bookedEl) bookedEl.textContent = String(bookedCalls.length);
}
function getDeptBadge(dept) {
  if (!dept) return "-";

  const colors = {
    service: "#3b82f6",
    sales: "#22c55e",
    parts: "#f97316",
    bdc: "#a855f7",
  };

  const color = colors[String(dept).toLowerCase()] || "#999";

  return `<span style="
    padding:4px 8px;
    border-radius:6px;
    background:${color}20;
    color:${color};
    font-weight:600;
  ">${dept}</span>`;
}
function setCallsLiveIndicator(state = "live") {
  const el = document.getElementById("callsLiveIndicator");
  if (!el) return;

  if (state === "loading") {
    el.style.background = "#eff6ff";
    el.style.color = "#1d4ed8";
    el.innerHTML = `
      <span style="
        width:8px;
        height:8px;
        border-radius:999px;
        background:#3b82f6;
        display:inline-block;
      "></span>
      Refreshing
    `;
    return;
  }

  if (state === "error") {
    el.style.background = "#fef2f2";
    el.style.color = "#991b1b";
    el.innerHTML = `
      <span style="
        width:8px;
        height:8px;
        border-radius:999px;
        background:#ef4444;
        display:inline-block;
      "></span>
      Error
    `;
    return;
  }

  el.style.background = "#ecfdf5";
  el.style.color = "#166534";
  el.innerHTML = `
    <span style="
      width:8px;
      height:8px;
      border-radius:999px;
      background:#22c55e;
      display:inline-block;
    "></span>
    Live
  `;
}
function updateCallsLastUpdated() {
  const el = document.getElementById("callsLastUpdated");
  if (!el) return;

  const now = new Date();
  const text = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  el.textContent = `Last updated: ${text}`;
}
function openCallDetailsModal() {
  const modal = document.getElementById("callDetailsModal");
  if (modal) modal.style.display = "flex";
}

function closeCallDetailsModal() {
  const modal = document.getElementById("callDetailsModal");
  if (modal) modal.style.display = "none";
}
async function loadCalls() {
  if (isLoadingCalls) return;
  isLoadingCalls = true;

  try {
    const res = await fetch("/.netlify/functions/api-calls");
    const data = await res.json();

    currentCalls = (data.calls || []).filter((call) => {
      return String(call.callSid || "").startsWith("CA");
    });

    console.log("Loaded calls:", currentCalls);

    updateKpis();

    const body = document.getElementById("callsTableBody");
    if (!body) {
      console.error("callsTableBody not found");
      return;
    }

    body.innerHTML = "";

    const filtered = filterCalls(currentCalls || []);
    console.log("Filtered calls:", filtered);

    if (!filtered.length) {
      body.innerHTML = `
        <tr>
          <td colspan="11" class="muted">No calls match the current filters.</td>
        </tr>
      `;
      return;
    }

    filtered.forEach((call) => {
      const tr = document.createElement("tr");

      if (call.notes && call.notes.trim()) {
        tr.style.borderLeft = "4px solid #f59e0b";
        tr.style.background = "#fffbeb";
      }

      const startedAt = call.startedAt || call.updatedAt || null;
      const duration = call.duration ? `${call.duration}s` : "-";
      const department = call.routedDepartment || "-";

      const recording = call.recordingUrl
        ? `<audio controls src="${escapeHtml(call.recordingUrl)}" style="width:140px; height:32px;"></audio>`
        : "-";

      const notesIndicator = getNotesIndicator(call.notes);

      const direction = getCallDirection(call);

      tr.innerHTML = `
        <td>${escapeHtml(formatDateOnly(startedAt))}</td>
        <td>${escapeHtml(formatTimeOnly(startedAt))}</td>
        <td>${escapeHtml(call.callSid || "-")}</td>
        <td>${formatCallPhoneCell(call.from)}</td>
        <td><span class="call-direction-badge ${direction === "outbound" ? "outbound" : "inbound"}">${escapeHtml(direction)}</span></td>
        <td>${escapeHtml(department)}</td>
        <td>${escapeHtml(call.status || "-")}</td>
        <td>${escapeHtml(call.language || "-")}</td>
        <td>${escapeHtml(duration)}</td>
        <td>${notesIndicator}</td>
        <td>${recording}</td>
      `;

      tr.style.cursor = "pointer";

   tr.onclick = () => {
  document.querySelectorAll("#callsTableBody tr").forEach((row) => {
    row.classList.remove("selected-row");
  });

  tr.classList.add("selected-row");
  selectedCallSid = call.callSid;

  showCallDetails(call);
  openCallDetailsModal();

  const notesBox = document.getElementById("notesBox");
  if (notesBox) notesBox.value = call.notes ?? "";

  const notesStatus = document.getElementById("notesStatus");
  if (notesStatus) notesStatus.textContent = "";
};

      body.appendChild(tr);
    });

    setCallsLiveIndicator("live");
    updateCallsLastUpdated();
    if (selectedCustomerId) renderCustomer360Detail();
  } catch (err) {
    console.error("❌ loadCalls error:", err);
    setCallsLiveIndicator("error");
  } finally {
    isLoadingCalls = false;
  }
}
function formatDateOnly(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

function formatTimeOnly(date) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString();
}


function getCallDirection(call) {
  const raw = String(call.direction || call.callDirection || call.directionLabel || "").toLowerCase();
  const from = normalizePhoneNumber(call.from || "");
  const to = normalizePhoneNumber(call.to || "");
  const knownOutboundNumbers = ["14504979243"];

  if (knownOutboundNumbers.includes(from.replace(/^\+/, ""))) return "outbound";
  if (raw.includes("out")) return "outbound";
  if (raw.includes("in")) return "inbound";

  const twilioVoiceNumber = normalizePhoneNumber(window.__TWILIO_VOICE_NUMBER__ || "");
  if (twilioVoiceNumber) {
    if (from === twilioVoiceNumber) return "outbound";
    if (to === twilioVoiceNumber) return "inbound";
  }

  return from ? "inbound" : "-";
}

function showCallDetails(call) {
  const panel = document.getElementById("callDetails");
  if (!panel) return;

  panel.innerHTML = `
<h3>Call Details • ${escapeHtml(formatPhonePretty(call.from || "-"))}</h3>

<p><strong>From:</strong> ${formatCallPhoneCell(call.from)}</p>
<p><strong>To:</strong> ${formatCallPhoneCell(call.to)}</p>
<p><strong>Status:</strong> ${call.status || "-"}</p>
<p><strong>Direction:</strong> ${getCallDirection(call)}</p>
<p><strong>Department:</strong> ${call.routedDepartment || "-"}</p>
<p><strong>Language:</strong> ${call.language || "-"}</p>
<p><strong>Duration:</strong> ${call.duration || "-"} sec</p>

${
  call.recordingUrl
    ? `<audio controls src="${call.recordingUrl}" style="margin-top:10px; width:100%;"></audio>`
    : `<div style="margin-top:10px; color:#6b7280;">No recording available</div>`
}

<!-- ✅ TRANSCRIPT BLOCK -->
<div style="margin-top:16px; padding-top:12px; border-top:1px solid #e5e7eb;">
  <h4 style="margin:0 0 8px 0;">Transcript</h4>
  <div style="
    white-space:pre-wrap;
    background:#f9fafb;
    border:1px solid #e5e7eb;
    border-radius:10px;
    padding:12px;
    min-height:100px;
  ">
    ${call.transcript || "No transcript available yet."}
  </div>
</div>

<!-- EXISTING SMS BLOCK -->
<div style="margin-top:16px; padding-top:12px; border-top:1px solid #e5e7eb;">
  <h4 style="margin:0 0 8px 0;">Send SMS</h4>

  <div style="font-size:13px; color:#8ea3bf; margin-bottom:8px;">
    To: ${formatCallPhoneCell(call.from)}
  </div>

  <textarea
    id="callSmsBox"
    placeholder="Type your message here"
    style="width:100%; min-height:80px;"
  ></textarea>

  <div style="margin-top:10px;">
    <button onclick="sendSmsToSelectedCall()">Send SMS</button>
    <span id="callSmsStatus" style="margin-left:10px;"></span>
  </div>
</div>
`;

  const notesBox = document.getElementById("notesBox");
  if (notesBox) notesBox.value = call.notes ?? "";

  const notesStatus = document.getElementById("notesStatus");
  if (notesStatus) notesStatus.textContent = "";
}

function getNotesIndicator(notes) {
  const hasNotes = String(notes || "").trim().length > 0;

  if (!hasNotes) {
    return `<span style="color:#9ca3af;">—</span>`;
  }

  return `<span style="
    display:inline-block;
    padding:4px 8px;
    border-radius:999px;
    background:#fef3c7;
    color:#92400e;
    font-size:12px;
    font-weight:600;
  ">📝 Note</span>`;
}
async function sendSmsToSelectedCall() {
  const selected = currentCalls.find(c => c.callSid === selectedCallSid);
  const message = document.getElementById("callSmsBox")?.value;

  if (!selected || !message) return;

  const status = document.getElementById("callSmsStatus");

  try {
    if (status) status.textContent = "Sending...";

    const res = await fetch("/.netlify/functions/send-sms-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: selected.from,
        message
      })
    });

    if (!res.ok) throw new Error();

    // ✅ SUCCESS
    if (status) status.textContent = "Sent ✅";

    // optional: clear box
    const box = document.getElementById("callSmsBox");
    if (box) box.value = "";

  } catch (err) {
    console.error("SMS failed:", err);

    if (status) status.textContent = "Failed ❌";
  }
}
async function showCall(callSid) {
  try {
    selectedCallSid = callSid;

    const res = await fetch(`/.netlify/functions/api-call?callSid=${encodeURIComponent(callSid)}`);
    const call = await res.json();

    if (!res.ok) {
      throw new Error(call.error || "Failed to load call");
    }

    const panel = document.getElementById("callDetails");
    if (!panel) return;

    panel.innerHTML = `
      <h3>Call Details • ${escapeHtml(formatPhonePretty(call.from || "-"))}</h3>

      <p><strong>From:</strong> ${formatCallPhoneCell(call.from)}</p>
      <p><strong>To:</strong> ${formatCallPhoneCell(call.to)}</p>
      <p><strong>Status:</strong> ${escapeHtml(call.status || "-")}</p>
      <p><strong>Department:</strong> ${escapeHtml(call.routedDepartment || "-")}</p>
      <p><strong>Language:</strong> ${escapeHtml(call.language || "-")}</p>
      <p><strong>Duration:</strong> ${escapeHtml(call.duration || "-")} sec</p>

      ${
        call.recordingUrl
          ? `<audio controls src="${escapeHtml(call.recordingUrl)}" style="margin-top:10px; width:100%;"></audio>`
          : `<div style="margin-top:10px; color:#6b7280;">No recording available</div>`
      }

      <div style="margin-top:16px; padding-top:12px; border-top:1px solid #e5e7eb;">
        <h4 style="margin:0 0 8px 0;">Transcript</h4>
        <div style="
          white-space:pre-wrap;
          background:#f9fafb;
          border:1px solid #e5e7eb;
          border-radius:10px;
          padding:12px;
          min-height:140px;
          max-height:320px;
          overflow:auto;
          line-height:1.45;
        ">
          ${escapeHtml(call.transcript || "No transcript available yet.")}
        </div>
      </div>

      <div style="margin-top:16px; padding-top:12px; border-top:1px solid #e5e7eb;">
        <h4 style="margin:0 0 8px 0;">Send SMS</h4>

        <div style="font-size:13px; color:#8ea3bf; margin-bottom:8px;">
          To: ${formatCallPhoneCell(call.from)}
        </div>

        <textarea
          id="callSmsBox"
          placeholder="Type your message here"
          style="width:100%; min-height:80px;"
        ></textarea>

        <div style="margin-top:10px;">
          <button onclick="sendSmsToSelectedCall()">Send SMS</button>
          <span id="callSmsStatus" style="margin-left:10px;"></span>
        </div>
      </div>
    `;

    // ✅ load notes into textarea (RIGHT SIDE PANEL)
    const notesBox = document.getElementById("notesBox");
    if (notesBox) notesBox.value = call.notes || "";

    const notesStatus = document.getElementById("notesStatus");
    if (notesStatus) notesStatus.textContent = "";

  } catch (err) {
    console.error("showCall error:", err);

    const panel = document.getElementById("callDetails");
    if (panel) {
      panel.innerHTML = `
        <div style="color:#991b1b; background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:10px;">
          Failed to load call details.
        </div>
      `;
    }
  }
}
async function saveNotes() {
  if (!selectedCallSid) {
    alert("Select a call first");
    return;
  }

  const notesBox = document.getElementById("notesBox");
  const notesStatus = document.getElementById("notesStatus");
  const notes = notesBox ? notesBox.value : "";

  try {
    if (notesStatus) notesStatus.textContent = "Saving...";

    const res = await fetch("/.netlify/functions/api-update-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callSid: selectedCallSid,
        notes,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to save notes");
    }

    const updatedCall = data.call || {};

    const index = currentCalls.findIndex((c) => c.callSid === selectedCallSid);
    if (index !== -1) {
      currentCalls[index] = {
        ...currentCalls[index],
        ...updatedCall,
        notes,
      };
    }

    await loadCalls();

    const selected = currentCalls.find((c) => c.callSid === selectedCallSid);
    if (selected) {
      showCallDetails(selected);
    }

    if (notesBox) notesBox.value = notes;
    if (notesStatus) notesStatus.textContent = "Saved ✅";
  } catch (err) {
    console.error("❌ Failed to save notes", err);
    if (notesStatus) notesStatus.textContent = "Save failed";
  }
}

function renderTags(tags = DEFAULT_TAGS) {
  const tagList = document.getElementById("tagList");
  if (!tagList) return;
  tagList.innerHTML = "";
  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = `{{${tag}}}`;
    tagList.appendChild(span);
  });
}

function applyTemplate(template, row) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => row?.[key] ?? "");
}

function setCampaignType(type) {
  const radio = document.querySelector(`input[name="campaignType"][value="${type}"]`);
  if (radio) radio.checked = true;
}

function getCampaignType() {
  const radio = document.querySelector('input[name="campaignType"]:checked');
  return radio ? radio.value : "dialer";
}

function updateStartButtonLabel() {
  const btn = document.getElementById("startCampaignBtn");
  if (!btn) return;
  btn.textContent = getCampaignType() === "dialer" ? "Start Dialer Campaign" : "Start SMS Campaign";
}

function updateCampaignPreview() {
  const select = document.getElementById("previewRowSelect");
  const template = document.getElementById("scriptTemplate")?.value || "";
  const preview = document.getElementById("renderedPreview");
  const details = document.getElementById("rowDetails");

  if (!preview || !details) return;

  if (!currentRows.length) {
    preview.textContent = "Upload a CSV to preview your script.";
    details.textContent = "No row selected.";
    return;
  }

  const row = currentRows[Number(select?.value) || 0];
  preview.textContent = applyTemplate(template, row);
  details.textContent = JSON.stringify(row, null, 2);
}

async function loadCampaign() {
  try {
    const [campaignRes, settingsRes] = await Promise.all([
      fetch("/.netlify/functions/campaign-preview"),
      fetch("/.netlify/functions/campaign-settings"),
    ]);

    const campaignData = await campaignRes.json();
    const settingsData = await settingsRes.json();

    currentRows = campaignData.rows || [];

    const templateBox = document.getElementById("scriptTemplate");
    if (templateBox) templateBox.value = settingsData.scriptTemplate || DEFAULT_VOICE_TEMPLATE;

    setCampaignType(settingsData.campaignType || "dialer");
    updateStartButtonLabel();

    const meta = document.getElementById("campaignMeta");
    const body = document.getElementById("campaignTableBody");
    const select = document.getElementById("previewRowSelect");

    if (body) body.innerHTML = "";
    if (select) select.innerHTML = "";

    if (!currentRows.length) {
      if (meta) meta.textContent = "No upload yet.";
      renderTags(DEFAULT_TAGS);
      updateCampaignPreview();
      return;
    }

    const headers = Array.from(new Set(currentRows.flatMap((r) => Object.keys(r))));
    renderTags(headers.length ? headers : DEFAULT_TAGS);

    if (meta) meta.textContent = `${currentRows.length} rows loaded • Uploaded ${new Date(campaignData.uploadedAt).toLocaleString()}`;

    currentRows.forEach((row, idx) => {
      if (select) {
        const displayName = String(((row.first_name || "") + " " + (row.last_name || "")).trim()).trim() || row.phone || `Row ${idx + 1}`;
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = `${idx + 1}. ${displayName}`;
        select.appendChild(option);
      }

      if (body) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(String(((row.first_name || "") + " " + (row.last_name || "")).trim()))}</td>
          <td>${escapeHtml(row.phone || "")}</td>
          <td>${escapeHtml(row.language || "")}</td>
          <td>${escapeHtml(formatVehicle(row))}</td>
          <td>${escapeHtml(row.service_due_date || "")}</td>
          <td>${escapeHtml(row.service_due_reason || "")}</td>
        `;
        body.appendChild(tr);
      }
    });

    updateCampaignPreview();
  } catch (err) {
    console.error("loadCampaign error:", err);
  }
}

async function uploadCampaign() {
  try {
    const file = document.getElementById("csvFile")?.files?.[0];
    const status = document.getElementById("uploadStatus");

    if (!file) {
      if (status) status.textContent = "Please choose a CSV file first.";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (status) status.textContent = "Uploading...";

    const res = await fetch("/.netlify/functions/upload-campaign", { method: "POST", body: formData });
    const data = await res.json();

    if (status) status.textContent = res.ok ? `Upload complete. ${data.rowsImported} rows imported.` : data.error || "Upload failed.";

    if (res.ok) await loadCampaign();
  } catch (err) {
    console.error("uploadCampaign error:", err);
  }
}

async function saveCampaignSettings() {
  try {
    const status = document.getElementById("uploadStatus");
    const res = await fetch("/.netlify/functions/save-campaign-settings", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        campaignType: getCampaignType(),
        scriptTemplate: document.getElementById("scriptTemplate")?.value || "",
      }),
    });

    const data = await res.json();
    if (status) status.textContent = res.ok ? "Campaign settings saved." : data.error || "Could not save settings.";
  } catch (err) {
    console.error("saveCampaignSettings error:", err);
  }
}

async function startCampaign() {
  try {
    const status = document.getElementById("uploadStatus");
    if (status) status.textContent = "Saving campaign settings...";

    const saveRes = await fetch("/.netlify/functions/save-campaign-settings", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        campaignType: getCampaignType(),
        scriptTemplate: document.getElementById("scriptTemplate")?.value || "",
      }),
    });

    const saveData = await saveRes.json();
    if (!saveRes.ok) {
      if (status) status.textContent = `Campaign failed: ${saveData.error || "Could not save settings."}`;
      return;
    }

    if (status) status.textContent = "Starting campaign...";

    const res = await fetch("/.netlify/functions/start-campaign", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      const details = data.error || data.message || JSON.stringify(data);
      if (status) status.textContent = `Campaign failed: ${details}`;
      return;
    }

    if (data.summary?.failed > 0) {
      const firstFailure = data.summary.results?.find((r) => r.status === "failed");
      if (status && firstFailure) status.textContent = `Campaign failed: ${firstFailure.error || "Unknown error"}`;
    } else if (status) {
      const verb = data.summary?.campaignType === "dialer" ? "Queued" : "Sent";
      status.textContent = `Campaign complete. ${verb}: ${data.summary.sent}, Failed: ${data.summary.failed}`;
    }

    await loadLastCampaignRun();
    await loadInbox();
  } catch (err) {
    const status = document.getElementById("uploadStatus");
    if (status) status.textContent = `Campaign failed: ${err.message}`;
  }
}

async function loadLastCampaignRun() {
  try {
    const res = await fetch("/.netlify/functions/last-campaign-run");
    const data = await res.json();
    const target = document.getElementById("campaignRunSummary");
    if (!target) return;

    if (!data?.runAt) {
      target.innerHTML = "No campaign run yet.";
      return;
    }

    const label = data.campaignType === "dialer" ? "Queued" : "Sent";
    target.innerHTML = `
      <div><strong>Last Run:</strong> ${escapeHtml(data.runAt || "")}</div>
      <div><strong>Type:</strong> ${escapeHtml(data.campaignType || "")}</div>
      <div><strong>Total:</strong> ${escapeHtml(String(data.total || 0))}</div>
      <div><strong>${label}:</strong> ${escapeHtml(String(data.sent || 0))}</div>
      <div><strong>Failed:</strong> ${escapeHtml(String(data.failed || 0))}</div>
    `;
  } catch (err) {
    console.error("loadLastCampaignRun error:", err);
  }
}

function downloadSample() {
  const sample = `phone,first_name,make,model,year,service_due
+15146084115,Nick,BMW,X5,2022,Oil Change
+15145551234,Sarah,MINI,Cooper,2021,Brake Service
`;
  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "campaign_sample.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapePreviewText(value) {
  return escapeHtml(String(value || "").slice(0, 120));
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
function getConversationPhone(msg, twilioNumber) {
  const normalize = (v) => String(v || "").replace(/\D/g, "");
  const from = normalize(msg.from);
  const to = normalize(msg.to);
  const mine = normalize(twilioNumber);

  if (from === mine) return msg.to || "";
  return msg.from || "";
}
function openComposeSmsModal() {
  const modal = document.getElementById("composeSmsModal");
  const status = document.getElementById("composeSmsStatus");
  const phone = document.getElementById("composePhoneNumber");
  const search = document.getElementById("composeCustomerSearch");
  const msg = document.getElementById("composeSmsMessage");
  const results = document.getElementById("composeSearchResults");

  if (modal) modal.style.display = "flex";
  if (status) status.textContent = "";
  if (phone) phone.value = "";
  if (search) search.value = "";
  if (msg) msg.value = "";
  if (results) results.innerHTML = "";

  phone?.focus();
}

function closeComposeSmsModal() {
  const modal = document.getElementById("composeSmsModal");
  if (modal) modal.style.display = "none";
}

function selectComposeCustomer(phone) {
  const phoneInput = document.getElementById("composePhoneNumber");
  const results = document.getElementById("composeSearchResults");
  if (phoneInput) phoneInput.value = phone;
  if (results) results.innerHTML = "";
}

function searchComposeCustomers() {
  const q = String(
    document.getElementById("composeCustomerSearch")?.value || ""
  )
    .trim()
    .toLowerCase();

  const results = document.getElementById("composeSearchResults");
  if (!results) return;

  if (!q) {
    results.innerHTML = "";
    return;
  }

  const cards = Array.isArray(currentInboxConversations)
    ? currentInboxConversations
    : [];

  const matches = cards
    .filter((c) => {
      const haystack = `${c.phone || ""} ${c.displayName || ""} ${c.preview || ""}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 8);

  if (!matches.length) {
    results.innerHTML = `<div class="muted" style="padding:8px 0;">No matches found.</div>`;
    return;
  }

  results.innerHTML = matches
    .map((c) => `
      <div
        style="padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; margin-bottom:8px; cursor:pointer; background:#fff;"
        onclick="selectComposeCustomer('${String(c.phone || "").replace(/'/g, "\\'")}')"
      >
        <div style="font-weight:600;">${c.displayName || c.phone || "-"}</div>
        <div class="muted">${c.phone || ""}</div>
      </div>
    `)
    .join("");
}

async function sendComposedSms() {
  const phoneInput = document.getElementById("composePhoneNumber");
  const msgInput = document.getElementById("composeSmsMessage");
  const status = document.getElementById("composeSmsStatus");

  const to = String(phoneInput?.value || "").trim();
  const message = String(msgInput?.value || "").trim();

  if (!to || !message) {
    if (status) status.textContent = "Enter phone number and message.";
    return;
  }

  try {
    if (status) status.textContent = "Sending...";

    const res = await fetch("/.netlify/functions/send-sms-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ to, message })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to send SMS");
    }

    if (status) status.textContent = "Sent ✅";
    if (msgInput) msgInput.value = "";

    await loadInbox();
    currentConversationPhone = to;
    await loadInboxThread(to);

    closeComposeSmsModal();
  } catch (err) {
    console.error("sendComposedSms error:", err);
    if (status) status.textContent = "Send failed";
  }
}
function isIncomingMessage(msg, phone) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  const normalizedFrom = String(msg?.from || "").replace(/\D/g, "");
  const type = String(msg?.type || "").toLowerCase();

  if (type === "sms") return true;
  if (type === "sms-reply" || type === "sms-outbound") return false;

  return normalizedFrom === normalizedPhone;
}

function isConversationUnread(messages, phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const latestIncoming = getLatestIncomingTimestamp(messages, normalizedPhone);
  if (!latestIncoming) return false;

  const readMap = getInboxReadMap();
  const lastRead = readMap[normalizedPhone];

  if (!lastRead) return true;

  return new Date(latestIncoming) > new Date(lastRead);
}

async function loadInbox() {
  if (isLoadingInbox) return;
  isLoadingInbox = true;

  try {
    const res = await fetch("/.netlify/functions/inbox-list");
    const data = await res.json();

    const list = document.getElementById("inboxList");
    if (!list) return;
    list.innerHTML = "";

    const q = (document.getElementById("inboxSearchBox")?.value || "")
      .toLowerCase()
      .trim();

    const baseConversations = data.conversations || [];

    const seen = new Set();
    const uniqueConversations = baseConversations.filter((c) => {
      if (seen.has(c.phone)) return false;
      seen.add(c.phone);
      return true;
    });

    const conversationsWithUnread = await Promise.all(
      uniqueConversations.map(async (item) => {
        try {
          const threadRes = await fetch(
            `/.netlify/functions/inbox-thread?phone=${encodeURIComponent(item.phone)}`
          );
          const threadData = await threadRes.json();
          const messages = threadData.messages || [];

          return {
            ...item,
            preview: String(item.lastMessage || item.message || item.body || "").trim(),
            unread: isConversationUnread(messages, item.phone),
          };
        } catch (err) {
          console.error("Unread check failed for", item.phone, err);
          return {
            ...item,
            preview: String(item.lastMessage || item.message || item.body || "").trim(),
            unread: false,
          };
        }
      })
    );

    const conversations = conversationsWithUnread
      .filter((item) => item.preview.length > 0)
      .filter((item) => {
        const haystack = `${item.phone} ${item.displayName} ${item.preview}`.toLowerCase();
        return !q || haystack.includes(q);
      });

    currentInboxConversations = conversations;
    updateInboxUnreadBadge();
    syncCommsSelection();
    renderCommsDock();

    if (conversations.length && !currentConversationPhone) {
  loadInboxThread(conversations[0].phone);
}
    if (!conversations.length) {
      list.innerHTML = `<div class="muted">No conversations yet.</div>`;
      renderCommsDock();
      return;
    }

    conversations.forEach((item) => {
      const row = document.createElement("div");
      row.className = `conversation-item ${item.unread ? "unread" : ""}`;

      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${item.unread ? `<span class="unread-dot"></span>` : ""}
              <strong>${item.displayName || item.phone}</strong>
            </div>
            <div class="muted">${item.phone}</div>
            <div style="margin-top:6px;">${item.preview || ""}</div>
          </div>
          <div class="muted small">${formatTimestamp(item.lastTimestamp)}</div>
        </div>
      `;

     row.onclick = async () => {
  currentConversationPhone = item.phone;

  markConversationRead(item.phone);

  await loadInboxThread(item.phone);

  item.unread = false;
  row.classList.remove("unread");

  const dot = row.querySelector(".unread-dot");
  if (dot) dot.remove();

  updateInboxUnreadBadge();
  syncCommsSelection();
  renderCommsDock();
};
      list.appendChild(row);
    });
  } catch (err) {
    console.error("loadInbox error:", err);
  } finally {
    isLoadingInbox = false;
  }
}
async function loadInboxThread(phone) {
  try {
    currentConversationPhone = phone;

    const res = await fetch(`/.netlify/functions/inbox-thread?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    const thread = document.getElementById("inboxThread");
    if (!thread) return;

    console.log("inbox-thread response:", data);

    const messages = (data.messages || [])
      .map((msg) => ({
        ...msg,
        displayBody: String(
          msg.body ??
          msg.message ??
          msg.response ??
          ""
        ).trim(),
      }))
      .filter((msg) => {
        return (
          (msg.type === "sms" || msg.type === "sms-reply" || msg.type === "sms-outbound" || msg.type === "outgoing") &&
          msg.displayBody.length > 0
        );
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    commsState.selectedPhone = phone;
    commsState.activeMessages = messages;
    syncCommsSelection();

    const latestIncoming = getLatestIncomingTimestamp(messages, phone);
    markConversationRead(phone, latestIncoming || new Date().toISOString());
    currentInboxConversations = (currentInboxConversations || []).map((item) => {
      const same = normalizePhoneNumber(item.phone) === normalizePhoneNumber(phone);
      return same ? { ...item, unread: false } : item;
    });
    updateInboxUnreadBadge();

    if (!messages.length) {
      thread.innerHTML = `<div class="muted">No text messages found.</div>`;
      renderCommsDock();
      return;
    }

    thread.innerHTML = messages.map((msg) => {
      const normalizedPhone = String(phone || "").replace(/\D/g, "");
      const normalizedFrom = String(msg.from || "").replace(/\D/g, "");
      const type = String(msg.type || "").toLowerCase();

      const isIncoming = type === "sms" || type === "sms-incoming"
        ? true
        : type === "sms-reply" || type === "outgoing" || type === "sms-outbound"
        ? false
        : normalizedFrom === normalizedPhone;

      return `
        <div style="display:flex; justify-content:${isIncoming ? "flex-start" : "flex-end"}; margin-bottom:12px;">
          <div class="msg-bubble ${isIncoming ? "msg-incoming" : "msg-outgoing"}" style="max-width:75%;">
            <div class="small muted" style="margin-bottom:6px;">
              ${isIncoming ? "Incoming" : "Outgoing"} • ${escapeHtml(formatTimestamp(msg.timestamp))}
            </div>
            <div>${escapeHtml(msg.displayBody || "(No text)")}</div>
            ${
              msg.recordingUrl
                ? `<div style="margin-top:8px;"><audio controls src="${escapeHtml(msg.recordingUrl)}"></audio></div>`
                : ""
            }
          </div>
        </div>
      `;
    }).join("");

    thread.scrollTop = thread.scrollHeight;
    document.getElementById("replyMessageBox")?.focus();

    const replyStatus = document.getElementById("replyStatus");
    if (replyStatus) replyStatus.textContent = `Replying to ${phone}`;
    renderCommsDock();
  } catch (err) {
    console.error("loadInboxThread error:", err);
  }
}

async function sendInboxReply() {
  try {
    const replyBox = document.getElementById("replyMessageBox");
    const replyStatus = document.getElementById("replyStatus");

    if (!currentConversationPhone) {
      if (replyStatus) replyStatus.textContent = "Select a conversation first.";
      return;
    }

    const message = replyBox?.value || "";
    if (!message.trim()) {
      if (replyStatus) replyStatus.textContent = "Enter a message first.";
      return;
    }

    if (replyStatus) replyStatus.textContent = "Sending...";

    const res = await fetch("/.netlify/functions/send-sms-reply", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ to: currentConversationPhone, message }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (replyStatus) replyStatus.textContent = data.error || "Failed to send.";
      return;
    }

    if (replyBox) replyBox.value = "";
    if (replyStatus) replyStatus.textContent = "Reply sent.";

    await loadInboxThread(currentConversationPhone);
    await loadInbox();
    renderCommsDock();
  } catch (err) {
    const replyStatus = document.getElementById("replyStatus");
    if (replyStatus) replyStatus.textContent = err.message;
  }
}

function safeParseJson(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getValue(id) {
  return document.getElementById(id)?.value ?? "";
}

function makeUserRow(user = {}) {
  const div = document.createElement("div");
  div.className = "item-row";
  div.innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Name</label><input class="cfg-user-name" type="text" value="${escapeHtml(user.name || "")}" /></div>
      <div class="field"><label>Email</label><input class="cfg-user-email" type="email" value="${escapeHtml(user.email || "")}" /></div>
      <div class="field"><label>Role</label><input class="cfg-user-role" type="text" value="${escapeHtml(user.role || "")}" /></div>
      <div class="field"><label>Permissions</label><input class="cfg-user-permissions" type="text" value="${escapeHtml(user.permissions || "")}" /></div>
      <div class="field"><label>Active</label>
        <select class="cfg-user-active">
          <option value="true" ${user.active ? "selected" : ""}>Active</option>
          <option value="false" ${!user.active ? "selected" : ""}>Inactive</option>
        </select>
      </div>
    </div>
    <div class="row-actions" style="margin-top:8px">
      <button type="button" class="secondary cfg-remove-user">Remove</button>
    </div>
  `;
  div.querySelector(".cfg-remove-user")?.addEventListener("click", () => div.remove());
  return div;
}

function makeAdvisorRow(advisor = {}) {
  const div = document.createElement("div");
  div.className = "item-row";
  div.innerHTML = `
    <div class="form-grid-3">
      <div class="field"><label>Name</label><input class="cfg-advisor-name" type="text" value="${escapeHtml(advisor.name || "")}" /></div>
      <div class="field"><label>Department</label><input class="cfg-advisor-department" type="text" value="${escapeHtml(advisor.department || "")}" /></div>
      <div class="field"><label>Email</label><input class="cfg-advisor-email" type="email" value="${escapeHtml(advisor.email || "")}" /></div>
      <div class="field"><label>Extension</label><input class="cfg-advisor-extension" type="text" value="${escapeHtml(advisor.extension || "")}" /></div>
      <div class="field"><label>Color</label><input class="cfg-advisor-color" type="text" value="${escapeHtml(advisor.color || "")}" /></div>
      <div class="field"><label>Active</label>
        <select class="cfg-advisor-active">
          <option value="true" ${advisor.active ? "selected" : ""}>Active</option>
          <option value="false" ${!advisor.active ? "selected" : ""}>Inactive</option>
        </select>
      </div>
      <div class="field"><label>Bookable Online</label>
        <select class="cfg-advisor-bookable">
          <option value="true" ${advisor.bookableOnline ? "selected" : ""}>Yes</option>
          <option value="false" ${!advisor.bookableOnline ? "selected" : ""}>No</option>
        </select>
      </div>
    </div>
    <div class="row-actions" style="margin-top:8px">
      <button type="button" class="secondary cfg-remove-advisor">Remove</button>
    </div>
  `;
  div.querySelector(".cfg-remove-advisor")?.addEventListener("click", () => div.remove());
  return div;
}

function collectUsers() {
  return [...document.querySelectorAll("#usersList .item-row")].map((row) => ({
    name: row.querySelector(".cfg-user-name")?.value || "",
    email: row.querySelector(".cfg-user-email")?.value || "",
    role: row.querySelector(".cfg-user-role")?.value || "",
    permissions: row.querySelector(".cfg-user-permissions")?.value || "",
    active: (row.querySelector(".cfg-user-active")?.value || "true") === "true",
  }));
}

function collectAdvisors() {
  return [...document.querySelectorAll("#advisorsList .item-row")].map((row) => ({
    name: row.querySelector(".cfg-advisor-name")?.value || "",
    department: row.querySelector(".cfg-advisor-department")?.value || "",
    email: row.querySelector(".cfg-advisor-email")?.value || "",
    extension: row.querySelector(".cfg-advisor-extension")?.value || "",
    color: row.querySelector(".cfg-advisor-color")?.value || "",
    active: (row.querySelector(".cfg-advisor-active")?.value || "true") === "true",
    bookableOnline: (row.querySelector(".cfg-advisor-bookable")?.value || "true") === "true",
  }));
}

function populateUsers(users) {
  const container = document.getElementById("usersList");
  if (!container) return;
  container.innerHTML = "";
  (users || []).forEach((u) => container.appendChild(makeUserRow(u)));
}

function populateAdvisors(advisors) {
  const container = document.getElementById("advisorsList");
  if (!container) return;
  container.innerHTML = "";
  (advisors || []).forEach((a) => container.appendChild(makeAdvisorRow(a)));
}

function fillConfigForm(config) {
  configCache = config;

  setValue("cfgBusinessName", config.general?.businessName);
  setValue("cfgDefaultLanguage", config.general?.defaultLanguage);
  setValue("cfgTimezone", config.general?.timezone);
  setValue("cfgDemoMode", config.general?.demoMode);

  populateUsers(config.users || []);
  populateAdvisors(config.advisors || []);

  setValue("cfgSlotDuration", config.scheduler?.slotDuration);
  setValue("cfgBufferMinutes", config.scheduler?.bufferMinutes);
  setValue("cfgMaxBookingsPerSlot", config.scheduler?.maxBookingsPerSlot);
  setValue("cfgBusinessHours", JSON.stringify(config.scheduler?.businessHours || {}, null, 2));
  setValue("cfgServiceTypes", (config.scheduler?.serviceTypes || []).join("\n"));
  setValue("cfgTransportOptions", (config.scheduler?.transportOptions || []).join("\n"));
  setValue("cfgClosedDates", (config.scheduler?.closedDates || []).join("\n"));

  setValue("cfgTwilioSid", config.twilio?.accountSid);
  setValue("cfgTwilioToken", "");
  setValue("cfgTwilioSmsNumber", config.twilio?.smsNumber);
  setValue("cfgTwilioVoiceNumber", config.twilio?.voiceNumber);
  setValue("cfgTwilioSmsWebhook", config.twilio?.smsWebhook);
  setValue("cfgTwilioVoiceWebhook", config.twilio?.voiceWebhook);
  setValue("cfgTwilioRecordingCallback", config.twilio?.recordingCallback);
  setValue("cfgTwilioTranscriptionCallback", config.twilio?.transcriptionCallback);

  setValue("cfgAiBackendUrl", config.aiReception?.backendUrl);
  setValue("cfgAiHumanFallback", config.aiReception?.humanFallback);
  setValue("cfgAiBdcFallback", config.aiReception?.bdcFallback);
  setValue("cfgAiOutboundRoute", config.aiReception?.outboundRoute);
  setValue("cfgAiGreetingFr", config.aiReception?.greetingFr);
  setValue("cfgAiGreetingEn", config.aiReception?.greetingEn);
  setValue("cfgAiRoutingRules", JSON.stringify(config.aiReception?.routingRules || {}, null, 2));

  setValue("cfgFortellisEnvironment", config.fortellis?.environment);
  setValue("cfgFortellisBaseUrl", config.fortellis?.baseUrl);
  setValue("cfgFortellisClientId", "");
  setValue("cfgFortellisClientSecret", "");
  setValue("cfgFortellisSubscriptionKey", "");
  setValue("cfgFortellisDealerId", config.fortellis?.dealerId);
  setValue("cfgFortellisRedirectUrl", config.fortellis?.redirectUrl);
  setValue("cfgFortellisScopes", config.fortellis?.scopes);

  setValue("cfgPhoneMain", config.phoneNumbers?.main);
  setValue("cfgPhoneService", config.phoneNumbers?.service);
  setValue("cfgPhoneSales", config.phoneNumbers?.sales);
  setValue("cfgPhoneParts", config.phoneNumbers?.parts);
  setValue("cfgPhoneBdc", config.phoneNumbers?.bdc);
  setValue("cfgPhoneFinance", config.phoneNumbers?.finance);
  setValue("cfgPhoneCollision", config.phoneNumbers?.collision);
  setValue("cfgPhoneTwilioSms", config.phoneNumbers?.twilioSms);
  setValue("cfgPhoneTwilioVoice", config.phoneNumbers?.twilioVoice);
}

function buildSectionPayload(section) {
  if (section === "general") {
    return {
      businessName: getValue("cfgBusinessName"),
      defaultLanguage: getValue("cfgDefaultLanguage"),
      timezone: getValue("cfgTimezone"),
      demoMode: getValue("cfgDemoMode"),
    };
  }

  if (section === "users") return collectUsers();
  if (section === "advisors") return collectAdvisors();

  if (section === "scheduler") {
    return {
      slotDuration: Number(getValue("cfgSlotDuration") || 30),
      bufferMinutes: Number(getValue("cfgBufferMinutes") || 0),
      maxBookingsPerSlot: Number(getValue("cfgMaxBookingsPerSlot") || 2),
      businessHours: safeParseJson(getValue("cfgBusinessHours"), {}),
      serviceTypes: getValue("cfgServiceTypes").split("\n").map(s => s.trim()).filter(Boolean),
      transportOptions: getValue("cfgTransportOptions").split("\n").map(s => s.trim()).filter(Boolean),
      closedDates: getValue("cfgClosedDates").split("\n").map(s => s.trim()).filter(Boolean),
    };
  }

  if (section === "twilio") {
    return {
      accountSid: getValue("cfgTwilioSid"),
      authToken: getValue("cfgTwilioToken"),
      smsNumber: getValue("cfgTwilioSmsNumber"),
      voiceNumber: getValue("cfgTwilioVoiceNumber"),
      smsWebhook: getValue("cfgTwilioSmsWebhook"),
      voiceWebhook: getValue("cfgTwilioVoiceWebhook"),
      recordingCallback: getValue("cfgTwilioRecordingCallback"),
      transcriptionCallback: getValue("cfgTwilioTranscriptionCallback"),
    };
  }

  if (section === "aiReception") {
    return {
      backendUrl: getValue("cfgAiBackendUrl"),
      humanFallback: getValue("cfgAiHumanFallback"),
      bdcFallback: getValue("cfgAiBdcFallback"),
      outboundRoute: getValue("cfgAiOutboundRoute"),
      greetingFr: getValue("cfgAiGreetingFr"),
      greetingEn: getValue("cfgAiGreetingEn"),
      routingRules: safeParseJson(getValue("cfgAiRoutingRules"), {}),
    };
  }

  if (section === "fortellis") {
    return {
      environment: getValue("cfgFortellisEnvironment"),
      baseUrl: getValue("cfgFortellisBaseUrl"),
      clientId: getValue("cfgFortellisClientId"),
      clientSecret: getValue("cfgFortellisClientSecret"),
      subscriptionKey: getValue("cfgFortellisSubscriptionKey"),
      dealerId: getValue("cfgFortellisDealerId"),
      redirectUrl: getValue("cfgFortellisRedirectUrl"),
      scopes: getValue("cfgFortellisScopes"),
    };
  }

  if (section === "phoneNumbers") {
    return {
      main: getValue("cfgPhoneMain"),
      service: getValue("cfgPhoneService"),
      sales: getValue("cfgPhoneSales"),
      parts: getValue("cfgPhoneParts"),
      bdc: getValue("cfgPhoneBdc"),
      finance: getValue("cfgPhoneFinance"),
      collision: getValue("cfgPhoneCollision"),
      twilioSms: getValue("cfgPhoneTwilioSms"),
      twilioVoice: getValue("cfgPhoneTwilioVoice"),
    };
  }

  return {};
}

async function loadConfig() {
  try {
    const res = await fetch("/.netlify/functions/config-get");
    const data = await res.json();
    fillConfigForm(data.config || DEFAULT_CONFIG);
    schedulerConfigCache = data.config?.scheduler || DEFAULT_CONFIG.scheduler;
    await hydrateSchedulerFromConfig();
    hydrateCustomer360AppointmentFields();
  } catch (err) {
    console.error("loadConfig error:", err);
    fillConfigForm(DEFAULT_CONFIG);
    schedulerConfigCache = DEFAULT_CONFIG.scheduler;
    await hydrateSchedulerFromConfig();
    hydrateCustomer360AppointmentFields();
  }
}

async function saveConfigSection(section) {
  const statusMap = {
    general: "configStatusGeneral",
    users: "configStatusUsers",
    advisors: "configStatusAdvisors",
    scheduler: "configStatusScheduler",
    twilio: "configStatusTwilio",
    aiReception: "configStatusAiReception",
    fortellis: "configStatusFortellis",
    phoneNumbers: "configStatusPhoneNumbers",
  };

  const statusEl = document.getElementById(statusMap[section]);
  if (statusEl) statusEl.textContent = "Saving...";

  try {
    const payload = buildSectionPayload(section);
    const res = await fetch("/.netlify/functions/config-save", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ section, value: payload }),
    });

    const data = await res.json();
    if (statusEl) statusEl.textContent = res.ok ? "Saved." : (data.error || "Save failed.");

    if (res.ok) {
      await loadConfig();
      await loadScheduler();
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = err.message;
  }
}

async function testFortellisConnection() {
  const statusEl = document.getElementById("configStatusFortellis");
  if (statusEl) statusEl.textContent = "Testing...";

  try {
    const res = await fetch("/.netlify/functions/fortellis-test");
    const data = await res.json();

    if (statusEl) {
      statusEl.textContent = res.ok ? "Fortellis connection successful." : (data.error || "Fortellis test failed.");
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = err.message;
  }
}

async function hydrateSchedulerFromConfig() {
  const cfg = schedulerConfigCache || DEFAULT_CONFIG.scheduler;
  const serviceSelect = document.getElementById("apptService");
  const advisorSelect = document.getElementById("apptAdvisor");
  const transportSelect = document.getElementById("apptTransport");

  if (serviceSelect) {
    serviceSelect.innerHTML = "";
    (cfg.serviceTypes || []).forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      serviceSelect.appendChild(opt);
    });
  }

  if (advisorSelect) {
    advisorSelect.innerHTML = "";
    const advisors = (configCache?.advisors || DEFAULT_CONFIG.advisors).filter((a) => a.active);
    advisors.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = a.name;
      advisorSelect.appendChild(opt);
    });
  }

  if (transportSelect) {
    transportSelect.innerHTML = "";
    (cfg.transportOptions || []).forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      transportSelect.appendChild(opt);
    });
  }
}

async function loadScheduler() {
  await loadAppointments();
  await refreshAppointmentSlots();
  await loadSchedulerBoard();
}

async function refreshAppointmentSlots() {
  try {
    const date = getValue("apptDate");
    const advisor = getValue("apptAdvisor");

    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (advisor) params.set("advisor", advisor);

    const res = await fetch(`/.netlify/functions/appointment-slots?${params.toString()}`);
    const data = await res.json();

    const select = document.getElementById("apptTime");
    if (!select) return;

    select.innerHTML = "";
    (data.slots || []).forEach((slot) => {
      const opt = document.createElement("option");
      opt.value = slot;
      opt.textContent = slot;
      select.appendChild(opt);
    });

    if (!data.slots?.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No slots available";
      select.appendChild(opt);
    }
  } catch (err) {
    console.error("refreshAppointmentSlots error:", err);
  }
}

async function bookAppointment() {
  try {
    const status = document.getElementById("appointmentStatus");
    if (status) status.textContent = "Booking...";

    const payload = {
      firstName: getValue("apptFirstName"),
      lastName: getValue("apptLastName"),
      phone: getValue("apptPhone"),
      email: getValue("apptEmail"),
      make: getValue("apptMake"),
      model: getValue("apptModel"),
      year: getValue("apptYear"),
      vin: getValue("apptVin"),
      mileage: getValue("apptMileage"),
      service: getValue("apptService"),
      advisor: getValue("apptAdvisor"),
      date: getValue("apptDate"),
      time: getValue("apptTime"),
      transport: getValue("apptTransport"),
      notes: getValue("apptNotes"),
    };

    const res = await fetch("/.netlify/functions/book-appointment", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (status) {
      status.textContent = res.ok ? `Booked. Confirmation: ${data.confirmationNumber || ""}` : (data.error || "Booking failed.");
    }

    if (res.ok) {
      await loadAppointments();
      await refreshAppointmentSlots();
      await loadSchedulerBoard();
    }
  } catch (err) {
    const status = document.getElementById("appointmentStatus");
    if (status) status.textContent = err.message;
  }
}

async function loadAppointments() {
  try {
    const res = await fetch("/.netlify/functions/appointments-list");
    const data = await res.json();
    const body = document.getElementById("appointmentsTableBody");
    const summary = document.getElementById("appointmentSummary");
    if (!body) return;

    body.innerHTML = "";
    const items = data.appointments || [];
    currentAppointments = items;

    if (summary) {
      summary.textContent = items.length ? `${items.length} appointments loaded.` : "No appointments loaded.";
    }

    items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.date || "")}</td>
        <td>${escapeHtml(item.time || "")}</td>
        <td>${escapeHtml(`${item.firstName || ""} ${item.lastName || ""}`.trim())}</td>
        <td>${escapeHtml([item.year, item.make, item.model].filter(Boolean).join(" "))}</td>
        <td>${escapeHtml(item.service || "")}</td>
        <td>${escapeHtml(item.advisor || "")}</td>
      `;
      body.appendChild(tr);
    });

    if (selectedCustomerId) renderCustomer360Detail();
  } catch (err) {
    console.error("loadAppointments error:", err);
  }
}

async function loadTasks() {
  try {
    const res = await fetch("/.netlify/functions/tasks-list");
    const data = await res.json();
    const body = document.getElementById("tasksTableBody");
    const summary = document.getElementById("tasksSummary");
    if (!body) return;

    currentTasks = data.tasks || [];
    body.innerHTML = "";

    if (summary) {
      summary.textContent = currentTasks.length
        ? `${currentTasks.length} tasks loaded.`
        : "No tasks loaded.";
    }

    if (!currentTasks.length) {
      body.innerHTML = `<tr><td colspan="5" class="muted">No tasks yet.</td></tr>`;
      if (selectedCustomerId) renderCustomer360();
      return;
    }

    currentTasks.forEach((task) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(task.title || "")}</td>
        <td>${escapeHtml(task.priority || "normal")}</td>
        <td>${escapeHtml(task.status || "open")}</td>
        <td>${escapeHtml(task.dueAtUtc ? new Date(task.dueAtUtc).toLocaleString() : "-")}</td>
        <td>
          ${task.status === "completed"
            ? `<span class="muted">Done</span>`
            : `<button class="secondary" onclick="completeTask('${escapeHtml(task.id)}')">Complete</button>`}
        </td>
      `;
      body.appendChild(tr);
    });

    if (selectedCustomerId) renderCustomer360();
  } catch (err) {
    console.error("loadTasks error:", err);
  }
}

async function createTask() {
  const status = document.getElementById("taskStatus");

  try {
    if (status) status.textContent = "Creating...";

    const payload = {
      title: getValue("taskTitle"),
      description: getValue("taskDescription"),
      assignedDepartment: normalizeDepartmentKey(getValue("taskDepartment") || "service"),
      assignedUser: getValue("taskAssignedUser"),
      priority: getValue("taskPriority"),
      dueAtUtc: getValue("taskDueAt") ? new Date(getValue("taskDueAt")).toISOString() : null,
    };

    const res = await fetch("/.netlify/functions/tasks-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create task");

    if (status) status.textContent = "Created ✅";
    ["taskTitle", "taskDescription", "taskDueAt"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    await loadTasks();
  } catch (err) {
    console.error("createTask error:", err);
    if (status) status.textContent = err.message || "Create failed";
  }
}

function hydrateStandaloneTaskAssignmentFields(department = "service") {
  const departmentEl = document.getElementById("taskDepartment");
  const userEl = document.getElementById("taskAssignedUser");
  if (!departmentEl || !userEl) return;

  if (!departmentEl.options.length) {
    ["service", "bdc", "sales", "technicians", "fi", "parts", "accounting"].forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = DEPARTMENT_LENSES[item]?.name || titleCase(item);
      departmentEl.appendChild(option);
    });
  }

  const normalizedDepartment = normalizeDepartmentKey(departmentEl.value || department) || "service";
  departmentEl.value = normalizedDepartment;
  const previousUser = userEl.value;
  userEl.innerHTML = `<option value="">Department queue</option>`;
  getDepartmentRoster(normalizedDepartment).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    userEl.appendChild(option);
  });
  userEl.value = previousUser || "";
}

async function completeTask(taskId) {
  try {
    const res = await fetch("/.netlify/functions/tasks-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status: "completed" }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update task");
    await loadTasks();
    await refreshSelectedCustomer360();
    renderCustomer360();
  } catch (err) {
    console.error("completeTask error:", err);
  }
}

async function loadSchedulerBoard() {
  try {
    const date = getValue("apptDate") || new Date().toISOString().slice(0, 10);
    const status = document.getElementById("schedulerBoardStatus");
    const head = document.getElementById("schedulerBoardHead");
    const body = document.getElementById("schedulerBoardBody");

    if (!head || !body) return;
    if (status) status.textContent = "Loading board...";

    const res = await fetch(`/.netlify/functions/scheduler-board?date=${encodeURIComponent(date)}`);
    const data = await res.json();

    if (!res.ok) {
      if (status) status.textContent = data.error || "Could not load scheduler board.";
      return;
    }

    if (data.closed) {
      head.innerHTML = "";
      body.innerHTML = "";
      if (status) status.textContent = `Closed on ${date}`;
      return;
    }

    const advisors = data.advisors || [];
    const slots = data.slots || [];
    const appointments = data.appointments || [];

    head.innerHTML = `
      <tr>
        <th style="min-width:100px;">Time</th>
        ${advisors.map((a) => `<th>${escapeHtml(a.name)}</th>`).join("")}
      </tr>
    `;

    body.innerHTML = slots.map((slot) => {
      const cols = advisors.map((advisor) => {
        const match = appointments.find((a) => a.time === slot && a.advisor === advisor.name);

        if (!match) {
          return `<td><div class="scheduler-board-cell scheduler-available">Available</div></td>`;
        }

        return `
          <td>
            <div class="scheduler-board-cell scheduler-booked">
              <div><strong>${escapeHtml(`${match.firstName || ""} ${match.lastName || ""}`.trim())}</strong></div>
              <div class="small">${escapeHtml([match.year, match.make, match.model].filter(Boolean).join(" "))}</div>
              <div class="small">${escapeHtml(match.service || "")}</div>
              <div class="small muted">${escapeHtml(match.phone || "")}</div>
            </div>
          </td>
        `;
      }).join("");

      return `<tr><td><strong>${escapeHtml(slot)}</strong></td>${cols}</tr>`;
    }).join("");

    if (status) status.textContent = `${appointments.length} appointments on ${date}`;
  } catch (err) {
    const status = document.getElementById("schedulerBoardStatus");
    if (status) status.textContent = err.message;
    console.error("loadSchedulerBoard error:", err);
  }
}


function normalizePhoneNumber(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return `+${raw.slice(1).replace(/\D/g, "")}`;
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function formatPhonePretty(value = "") {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return value || "-";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits[0]} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,11)}`;
  }
  return normalized;
}

function formatCallPhoneCell(phone) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return escapeHtml(phone || "-");
  const label = formatPhonePretty(phone);
  return `<button type="button" class="phone-cta" onclick="event.stopPropagation(); openDialerForPhone('${escapeHtml(normalized)}')">📞 ${escapeHtml(label)}</button>`;
}

function formatShortTimestamp(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function syncCommsSelection() {
  const selectedPhone = normalizePhoneNumber(commsState.selectedPhone || currentConversationPhone);
  if (!selectedPhone) {
    commsState.selectedContact = null;
    return;
  }

  commsState.selectedPhone = selectedPhone;
  const normalizedDigits = selectedPhone.replace(/\D/g, "");
  const conversation = (currentInboxConversations || []).find((item) => normalizePhoneNumber(item.phone).replace(/\D/g, "") === normalizedDigits);
  const relatedCall = (currentCalls || []).find((item) => normalizePhoneNumber(item.from).replace(/\D/g, "") === normalizedDigits);

  commsState.selectedContact = {
    phone: selectedPhone,
    displayName: conversation?.displayName || relatedCall?.userName || formatPhonePretty(selectedPhone),
    preview: conversation?.preview || conversation?.lastMessage || "",
    lastTimestamp: conversation?.lastTimestamp || relatedCall?.startedAt || relatedCall?.updatedAt || "",
    department: relatedCall?.routedDepartment || "",
    language: relatedCall?.language || "",
    source: conversation ? "inbox" : relatedCall ? "calls" : "manual",
  };
}

function getCommsContacts() {
  const map = new Map();

  (currentInboxConversations || []).forEach((item) => {
    const phone = normalizePhoneNumber(item.phone);
    if (!phone) return;
    map.set(phone, {
      phone,
      displayName: item.displayName || formatPhonePretty(phone),
      preview: item.preview || item.lastMessage || "",
      lastTimestamp: item.lastTimestamp || "",
      source: "inbox",
      unread: !!item.unread,
      department: "",
      language: "",
    });
  });

  (currentCalls || []).forEach((item) => {
    const phone = normalizePhoneNumber(item.from);
    if (!phone) return;
    const existing = map.get(phone) || {
      phone,
      displayName: item.userName || formatPhonePretty(phone),
      preview: "",
      lastTimestamp: item.startedAt || item.updatedAt || "",
      source: "calls",
      unread: false,
    };

    existing.department = existing.department || item.routedDepartment || "";
    existing.language = existing.language || item.language || "";
    existing.lastTimestamp = existing.lastTimestamp || item.startedAt || item.updatedAt || "";
    if (!existing.preview && item.transcript) {
      existing.preview = String(item.transcript).slice(0, 90);
    }
    map.set(phone, existing);
  });

  const q = String(commsState.search || "").trim().toLowerCase();
  return Array.from(map.values())
    .filter((item) => {
      if (!q) return true;
      const haystack = `${item.displayName || ""} ${item.phone || ""} ${item.preview || ""} ${item.department || ""}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      const aTs = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const bTs = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return bTs - aTs;
    });
}

function getSelectedScript() {
  return COMM_SCRIPT_LIBRARY.find((item) => item.id === commsState.scripted.scriptId) || COMM_SCRIPT_LIBRARY[0];
}

function updateCommsDockChrome() {
  const dock = document.getElementById("commsDock");
  const badge = document.getElementById("commsUnreadBadgeDock");
  const callBadge = document.getElementById("commsCallStateBadge");
  const toggle = document.getElementById("commsDockToggle");
  const summary = document.getElementById("commsDockSummary");
  const collapseBtn = document.getElementById("commsDockCollapseBtn");
  if (!dock) return;

  dock.classList.toggle("open", !!commsState.isOpen);
  dock.classList.toggle("compact", !commsState.isOpen);
  if (toggle) toggle.textContent = commsState.isOpen ? "💬 INGRID Communication Dock" : "💬 INGRID Communication Dock";
  if (summary) {
    const contact = commsState.selectedContact?.displayName || formatPhonePretty(commsState.selectedPhone || "") || "";
    summary.textContent = commsState.isOpen
      ? (contact ? `${contact} selected • ${commsState.mode}` : `Mode: ${commsState.mode}`)
      : "Calls and SMS from one place.";
  }
  if (collapseBtn) collapseBtn.textContent = commsState.isOpen ? "▾" : "▴";

  const unreadCount = (currentInboxConversations || []).filter((item) => item.unread).length;
  if (badge) {
    badge.style.display = unreadCount ? "inline-flex" : "none";
    badge.textContent = `${unreadCount} unread`;
  }

  if (callBadge) {
    const status = String(commsState.call.status || "").trim();
    if (!status) {
      callBadge.style.display = "none";
    } else {
      callBadge.style.display = "inline-flex";
      callBadge.textContent = status;
      callBadge.className = "comms-pill";
      if (/connected|ready|active/i.test(status)) callBadge.classList.add("active");
      if (/offline|failed|error/i.test(status)) callBadge.classList.add("alert");
    }
  }
}

function renderCommsSidebar() {
  const sidebar = document.getElementById("commsSidebarList");
  if (!sidebar) return;

  const contacts = getCommsContacts();
  if (!contacts.length) {
    sidebar.innerHTML = `<div class="comms-empty">No conversations or contacts match your search yet.</div>`;
    return;
  }

  sidebar.innerHTML = contacts.map((item) => {
    const phone = normalizePhoneNumber(item.phone);
    const isActive = normalizePhoneNumber(commsState.selectedPhone) === phone;
    const unreadClass = item.unread ? "unread" : "";
    return `
      <div class="comms-thread-item ${isActive ? "active" : ""} ${unreadClass}" onclick="selectCommsContact('${escapeHtml(phone)}', '${escapeHtml(commsState.mode)}')">
        <div class="comms-thread-top">
          <strong>${escapeHtml(item.displayName || formatPhonePretty(phone))}</strong>
          <span class="comms-mini">${escapeHtml(formatShortTimestamp(item.lastTimestamp))}</span>
        </div>
        <div class="comms-mini">${escapeHtml(formatPhonePretty(phone))}</div>
        <div class="comms-thread-preview">${escapeHtml(item.preview || item.department || "Open communications")}</div>
      </div>
    `;
  }).join("");
}

function renderCommsMessages() {
  const header = document.getElementById("commsMainHeader");
  const content = document.getElementById("commsMainContent");
  if (!header || !content) return;

  syncCommsSelection();
  const contact = commsState.selectedContact;
  header.innerHTML = `
    <div>
      <div style="font-size:22px;font-weight:700;">${escapeHtml(contact?.displayName || "Select a thread")}</div>
      <div class="comms-mini">${escapeHtml(contact?.phone ? formatPhonePretty(contact.phone) : "Choose any conversation or search a contact")}</div>
    </div>
    <div class="comms-main-actions">
      <button type="button" class="comms-secondary-btn" onclick="openDialerForPhone('${escapeHtml(contact?.phone || "")}')">📞 Call</button>
    </div>
  `;

  if (!contact?.phone) {
    content.innerHTML = `<div class="comms-empty">Pick a conversation from the left, or search a customer to start messaging.</div>`;
    return;
  }

  const messages = Array.isArray(commsState.activeMessages) ? commsState.activeMessages : [];
  content.innerHTML = `
    <div class="comms-message-list" id="commsMessageList">
      ${messages.length ? messages.map((msg) => {
        const normalizedPhone = normalizePhoneNumber(contact.phone).replace(/\D/g, "");
        const normalizedFrom = normalizePhoneNumber(msg.from || "").replace(/\D/g, "").replace(/^\+/, "");
        const type = String(msg.type || "").toLowerCase();
        const outgoing = type === "sms-reply" || type === "outgoing" ? true : !(type === "sms" || type === "sms-incoming" || normalizedFrom === normalizedPhone);
        return `
          <div class="comms-message ${outgoing ? "outgoing" : ""}">
            <div>${escapeHtml(msg.displayBody || msg.body || "")}</div>
            <div class="comms-message-meta">${outgoing ? "Outgoing" : "Incoming"} • ${escapeHtml(formatTimestamp(msg.timestamp))}</div>
          </div>
        `;
      }).join("") : `<div class="comms-empty">No SMS history loaded yet for this customer.</div>`}
    </div>
    ${/ai|thinking|drafting/i.test(commsState.smsStatus || "") ? `<div class="comms-ai-indicator" style="margin:0 12px 10px 12px;"><span class="comms-ai-dot"></span>INGRID is typing…</div>` : ``}
    <div class="comms-composer">
      <textarea id="commsSmsComposer" placeholder="Type your SMS reply here">${escapeHtml(commsState.smsDraft || "")}</textarea>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:130px;">
        <button type="button" onclick="sendCommsSms()">Send SMS</button>
        <span id="commsSmsStatus" class="comms-mini">${escapeHtml(commsState.smsStatus || `Replying to ${formatPhonePretty(contact.phone)}`)}</span>
      </div>
    </div>
  `;
  const list = document.getElementById("commsMessageList");
  if (list) list.scrollTop = list.scrollHeight;

  const composer = document.getElementById("commsSmsComposer");
  if (composer) {
    composer.addEventListener("input", (event) => {
      commsState.smsDraft = event.target.value || "";
    });
  }
}

function renderCommsContacts() {
  const header = document.getElementById("commsMainHeader");
  const content = document.getElementById("commsMainContent");
  if (!header || !content) return;

  header.innerHTML = `
    <div>
      <div style="font-size:22px;font-weight:700;">Contacts</div>
      <div class="comms-mini">Search from inbox threads and recent caller history now. CRM enrichment can plug in later without redesigning this dock.</div>
    </div>
    <div class="comms-status-badge warn">CRM integration intentionally deferred</div>
  `;

  const contacts = getCommsContacts();
  content.innerHTML = `
    <div class="comms-script-box">
      ${contacts.length ? contacts.map((item) => {
        const phone = normalizePhoneNumber(item.phone);
        return `
          <div class="comms-contact-card" style="margin-bottom:12px;">
            <div>
              <div style="font-size:18px;font-weight:700;">${escapeHtml(item.displayName || formatPhonePretty(phone))}</div>
              <div class="comms-contact-meta">${escapeHtml(formatPhonePretty(phone))}</div>
              <div class="comms-contact-meta">${escapeHtml(item.preview || item.department || "Recent customer activity")}</div>
            </div>
            <div class="comms-grid-actions">
              <button type="button" class="comms-secondary-btn green" onclick="openDialerForPhone('${escapeHtml(phone)}')">Call</button>
              <button type="button" class="comms-secondary-btn" onclick="openSmsForPhone('${escapeHtml(phone)}')">SMS</button>
              <button type="button" class="comms-secondary-btn" onclick="openScriptedForPhone('${escapeHtml(phone)}')">Scripted</button>
            </div>
          </div>
        `;
      }).join("") : `<div class="comms-empty">No contacts available yet. Start with any caller or inbox thread and this list will grow automatically.</div>`}
    </div>
  `;
}

function renderCommsDialer() {
  const header = document.getElementById("commsMainHeader");
  const content = document.getElementById("commsMainContent");
  if (!header || !content) return;

  syncCommsSelection();
  const contact = commsState.selectedContact;
  const phone = normalizePhoneNumber(commsState.selectedPhone || contact?.phone || "");
  const activeLabel = activeTwilioCall ? "Connected" : twilioReady ? "Ready" : "Offline";
  const statusClass = /ready|connected/i.test(commsState.call.status || activeLabel)
    ? "success"
    : /error|offline|failed/i.test(commsState.call.status || "")
    ? "warn"
    : "warn";

  header.innerHTML = `
    <div>
      <div style="font-size:22px;font-weight:700;">Automotive Intelligence Dialer</div>
    </div>
    <div class="comms-status-badge ${statusClass}">${escapeHtml(commsState.call.status || activeLabel)}</div>
  `;

  content.innerHTML = `
    <div class="comms-dialer-grid">
      <div class="card" style="padding:16px;box-shadow:none;border:1px solid #e5e7eb;">
        <div class="comms-field">
          <label>Number</label>
          <input id="commsDialerNumber" type="text" value="${escapeHtml(phone)}" placeholder="+1514..." />
        </div>
        <div class="comms-field">
          <label>Selected Contact</label>
          <div class="comms-mini">${escapeHtml(contact?.displayName || "Manual entry")}</div>
        </div>
        <div class="comms-script-actions">
          <button type="button" onclick="startCommsCall()">Start Call</button>
          <button type="button" class="secondary" onclick="answerCommsCall()">Answer</button>
          <button type="button" class="secondary" onclick="muteCommsCall()">${twilioMuted ? "Unmute" : "Mute"}</button>
          <button type="button" class="danger" onclick="hangupCommsCall()">Hang up</button>
        </div>
      </div>
    </div>
  `;
}

function renderCommsScripted() {
  const header = document.getElementById("commsMainHeader");
  const content = document.getElementById("commsMainContent");
  if (!header || !content) return;

  syncCommsSelection();
  const contact = commsState.selectedContact;
  const script = getSelectedScript();

  header.innerHTML = `
    <div>
      <div style="font-size:22px;font-weight:700;">Scripted Outbound</div>
      <div class="comms-mini">Use the same voice pipeline as campaigns, but launch a single AI outbound call from anywhere in the app.</div>
    </div>
    <div class="comms-status-badge ${commsState.scripted.running ? "success" : "warn"}">${escapeHtml(commsState.scripted.status || "Ready")}</div>
  `;

  content.innerHTML = `
    <div class="comms-script-box">
      <div class="comms-contact-card" style="margin-bottom:14px;">
        <div>
          <div style="font-size:18px;font-weight:700;">${escapeHtml(contact?.displayName || "No contact selected")}</div>
          <div class="comms-contact-meta">${escapeHtml(contact?.phone ? formatPhonePretty(contact.phone) : "Choose a contact first")}</div>
          <div class="comms-contact-meta">${escapeHtml(contact?.department || "Department can be inferred from the selected script")}</div>
        </div>
        <div class="comms-grid-actions">
          <button type="button" class="comms-secondary-btn" onclick="setCommsMode('contacts')">Find contact</button>
          <button type="button" class="comms-secondary-btn green" onclick="openDialerForPhone('${escapeHtml(contact?.phone || "")}')">Manual Call</button>
        </div>
      </div>

      <div class="comms-field">
        <label>Script</label>
        <select id="commsScriptSelect" onchange="updateCommsScriptSelection(this.value)">
          ${COMM_SCRIPT_LIBRARY.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === script.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="comms-mini" style="margin-bottom:16px;">${escapeHtml(script.description)}</div>
      <div class="comms-field">
        <label>Operator notes / variables</label>
        <textarea id="commsScriptNotes" placeholder="Optional personalization, service due note, last conversation context, or booking goal">${escapeHtml(commsState.scripted.notes || "")}</textarea>
      </div>
      <div class="comms-script-actions">
        <button type="button" onclick="startScriptedOutbound()">Start AI Scripted Call</button>
        <button type="button" class="secondary" onclick="prefillScriptFromSelection()">Use selected contact context</button>
      </div>
      <div class="comms-mini" style="margin-top:12px;">This UI is live now. The final behavior is designed to call the same outbound backend used by your campaign dialer.</div>
    </div>
  `;
}

function renderCommsDock() {
  updateCommsDockChrome();

  ["messages", "dialer"].forEach((mode) => {
    const map = {
      messages: "commsModeMessagesBtn",
      contacts: "commsModeContactsBtn",
      dialer: "commsModeDialerBtn",
      scripted: "commsModeScriptedBtn",
    };
    const el = document.getElementById(map[mode]);
    if (el) el.classList.toggle("active", commsState.mode === mode);
  });

  renderCommsSidebar();

  if (commsState.mode === "dialer") return renderCommsDialer();
  return renderCommsMessages();
}

function setCommsMode(mode = "messages") {
  commsState.mode = mode;
  commsState.isOpen = true;
  renderCommsDock();
}

function openCommsDock(options = {}) {
  if (typeof options === "string") options = { mode: options };
  commsState.isOpen = true;
  if (options.mode) commsState.mode = options.mode;
  if (options.search !== undefined) commsState.search = options.search;
  if (options.phone) {
    const normalized = normalizePhoneNumber(options.phone);
    commsState.selectedPhone = normalized;
    currentConversationPhone = normalized;
    if (commsState.mode === "messages") {
      loadInboxThread(normalized);
    }
  }
  syncCommsSelection();
  renderCommsDock();
}

function toggleCommsDock() {
  commsState.isOpen = !commsState.isOpen;
  renderCommsDock();
}

function selectCommsContact(phone, preferredMode = "messages") {
  const normalized = normalizePhoneNumber(phone);
  commsState.selectedPhone = normalized;
  currentConversationPhone = normalized;
  commsState.mode = preferredMode;
  commsState.isOpen = true;
  syncCommsSelection();
  if (preferredMode === "messages") {
    loadInboxThread(normalized);
  }
  renderCommsDock();
}

async function sendCommsSms() {
  const phone = normalizePhoneNumber(commsState.selectedPhone || currentConversationPhone);
  const box = document.getElementById("commsSmsComposer");
  const message = String(box?.value || commsState.smsDraft || "").trim();
  if (!phone) {
    commsState.smsStatus = "Choose a customer first.";
    return renderCommsDock();
  }
  if (!message) {
    commsState.smsStatus = "Enter a message first.";
    return renderCommsDock();
  }

  commsState.smsDraft = message;
  commsState.smsStatus = "Sending...";
  renderCommsDock();

  try {
    const res = await fetch("/.netlify/functions/send-sms-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send SMS.");

    commsState.smsDraft = "";
    commsState.smsStatus = `SMS sent to ${formatPhonePretty(phone)}`;
    await loadInboxThread(phone);
    await loadInbox();
  } catch (err) {
    commsState.smsStatus = err.message || "Failed to send SMS.";
    renderCommsDock();
  }
}

function setCommsCallStatus(status, action = "") {
  commsState.call.status = status;
  if (action) commsState.call.lastAction = action;
  renderCommsDock();
}

async function startCommsCall() {
  const phone = normalizePhoneNumber(document.getElementById("commsDialerNumber")?.value || commsState.selectedPhone || "");
  if (!phone) {
    return setCommsCallStatus("Missing number", "Enter a valid number first");
  }

  try {
    commsState.call.dialing = true;
    setCommsCallStatus("Connecting", `Requesting browser registration for ${phone}`);
    await initTwilioDevice();

    const res = await fetch("/.netlify/functions/voice-outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        mode: "manual-softphone",
        initiatedBy: "dashboard-dock",
        source: "communications-dock",
        agentIdentity: twilioIdentity || "frontdesk-1"
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || "Voice backend returned an error.");

    setCommsCallStatus("Calling", data.callSid ? `Outbound requested • ${data.callSid}` : `Outbound requested for ${phone}`);
  } catch (err) {
    console.error("startCommsCall error:", err);
    setCommsCallStatus("Error", err.message || "Unable to start the browser call");
  } finally {
    commsState.call.dialing = false;
    renderCommsDock();
  }
}

function answerCommsCall() {
  if (!activeTwilioCall) {
    return setCommsCallStatus("No incoming leg", "Start a call first or wait for the browser leg to ring");
  }
  try {
    activeTwilioCall.accept();
    setCommsCallStatus("Connected", "Browser call accepted");
  } catch (err) {
    console.error("answerCommsCall error:", err);
    setCommsCallStatus("Error", err.message || "Could not answer the call");
  }
}

function hangupCommsCall() {
  try {
    if (activeTwilioCall) {
      activeTwilioCall.disconnect();
      activeTwilioCall = null;
    }
    if (twilioDevice) {
      twilioDevice.disconnectAll();
    }
    twilioMuted = false;
    setCommsCallStatus("Ended", "Call disconnected");
  } catch (err) {
    console.error("hangupCommsCall error:", err);
    setCommsCallStatus("Error", err.message || "Could not hang up the call");
  }
}

function muteCommsCall() {
  if (!activeTwilioCall) {
    return setCommsCallStatus("No active call", "Connect a call before muting");
  }
  try {
    twilioMuted = !twilioMuted;
    activeTwilioCall.mute(twilioMuted);
    setCommsCallStatus(twilioMuted ? "Muted" : "Connected", twilioMuted ? "Microphone muted" : "Microphone live");
  } catch (err) {
    console.error("muteCommsCall error:", err);
    setCommsCallStatus("Error", err.message || "Could not change mute state");
  }
}

function updateCommsScriptSelection(value) {
  commsState.scripted.scriptId = value;
  renderCommsDock();
}

function prefillScriptFromSelection() {
  syncCommsSelection();
  const contact = commsState.selectedContact;
  const lines = [];
  if (contact?.displayName) lines.push(`Customer: ${contact.displayName}`);
  if (contact?.phone) lines.push(`Phone: ${formatPhonePretty(contact.phone)}`);
  if (contact?.department) lines.push(`Department: ${contact.department}`);
  if (contact?.preview) lines.push(`Recent context: ${contact.preview}`);
  commsState.scripted.notes = lines.join("\n");
  renderCommsDock();
}

async function startScriptedOutbound() {
  syncCommsSelection();
  const phone = normalizePhoneNumber(commsState.selectedPhone || "");
  const script = getSelectedScript();
  const notesValue = String(document.getElementById("commsScriptNotes")?.value || commsState.scripted.notes || "").trim();
  commsState.scripted.notes = notesValue;

  if (!phone) {
    commsState.scripted.status = "Select a customer before starting a scripted outbound call.";
    return renderCommsDock();
  }

  commsState.scripted.running = true;
  commsState.scripted.status = `Launching ${script.name}...`;
  renderCommsDock();

  try {
    const res = await fetch("/.netlify/functions/voice-outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        mode: "scripted-outbound",
        initiatedBy: "dashboard-dock",
        source: "communications-dock",
        scriptId: script.id,
        notes: notesValue,
        department: script.department,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Scripted outbound failed.");
    commsState.scripted.status = data.callSid ? `${script.name} requested • ${data.callSid}` : `${script.name} request sent to backend.`;
  } catch (err) {
    commsState.scripted.status = err.message || "Scripted outbound is not wired yet.";
  } finally {
    commsState.scripted.running = false;
    renderCommsDock();
  }
}

function openDialerForPhone(phone) {
  openCommsDock({ mode: "dialer", phone });
  initTwilioDevice().catch((err) => {
    console.error("Twilio init from dialer open failed:", err);
  });
}

function openSmsForPhone(phone) {
  openCommsDock({ mode: "messages", phone });
}

function openScriptedForPhone(phone) {
  openCommsDock({ mode: "scripted", phone });
}

function initCommsDock() {
  document.getElementById("commsDockToggle")?.addEventListener("click", toggleCommsDock);
  document.getElementById("commsDockCollapseBtn")?.addEventListener("click", toggleCommsDock);
  document.getElementById("commsModeMessagesBtn")?.addEventListener("click", () => setCommsMode("messages"));
  document.getElementById("commsModeDialerBtn")?.addEventListener("click", async () => {
    setCommsMode("dialer");
    try {
      await initTwilioDevice();
    } catch (err) {
      console.error("Twilio init on dialer open failed:", err);
    }
  });
  document.getElementById("commsSearchInput")?.addEventListener("input", (event) => {
    commsState.search = event.target.value || "";
    renderCommsDock();
  });
  setCommsCallStatus("Idle", "Dial or text from one place");
  renderCommsDock();
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initConfigPanels();
  initKpiFilters();
  wireTrainingButtons();
  initCommsDock();
  initDepartmentMenu();
  initPhoneLinkRouting();
  wireCustomer360Dock();
  setDepartmentLens("home");

  setInterval(() => {
    loadInbox();
  }, 5000);

  document.getElementById("refreshCallsBtn")?.addEventListener("click", loadCalls);

  document.getElementById("refreshCallsBtn")?.addEventListener("click", loadCalls);

  document.getElementById("closeCallDetailsModalBtn")?.addEventListener("click", closeCallDetailsModal);

document.getElementById("callDetailsModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "callDetailsModal") {
    closeCallDetailsModal();
  }
});

// ✅ ADD THIS BLOCK RIGHT HERE
document.getElementById("todayFilterBtn")?.addEventListener("click", () => {
  const today = new Date().toISOString().slice(0, 10);

  const fromEl = document.getElementById("dateFrom");
  const toEl = document.getElementById("dateTo");

  if (fromEl) fromEl.value = today;
  if (toEl) toEl.value = today;

  loadCalls();
});

document.getElementById("yesterdayFilterBtn")?.addEventListener("click", () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);

  const fromEl = document.getElementById("dateFrom");
  const toEl = document.getElementById("dateTo");

  if (fromEl) fromEl.value = yesterday;
  if (toEl) toEl.value = yesterday;

  loadCalls();
});

document.getElementById("last7DaysBtn")?.addEventListener("click", () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const fromEl = document.getElementById("dateFrom");
  const toEl = document.getElementById("dateTo");

  if (fromEl) fromEl.value = fromStr;
  if (toEl) toEl.value = toStr;

  loadCalls();
});

document.getElementById("thisMonthBtn")?.addEventListener("click", () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const today = now.toISOString().slice(0, 10);
  const firstDay = `${year}-${month}-01`;

  const fromEl = document.getElementById("dateFrom");
  const toEl = document.getElementById("dateTo");

  if (fromEl) fromEl.value = firstDay;
  if (toEl) toEl.value = today;

  loadCalls();
});

document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
  const fromEl = document.getElementById("dateFrom");
  const toEl = document.getElementById("dateTo");
  const searchEl = document.getElementById("searchBox");

  if (fromEl) fromEl.value = "";
  if (toEl) toEl.value = "";
  if (searchEl) searchEl.value = "";

  loadCalls();
});

document.getElementById("searchBox")?.addEventListener("input", loadCalls);
document.getElementById("dateFrom")?.addEventListener("change", loadCalls);
document.getElementById("dateTo")?.addEventListener("change", loadCalls);
  document.getElementById("saveNotesBtn")?.addEventListener("click", saveNotes);

  document.getElementById("uploadBtn")?.addEventListener("click", uploadCampaign);
  document.getElementById("sampleBtn")?.addEventListener("click", downloadSample);

  document.getElementById("loadVoiceTemplateBtn")?.addEventListener("click", () => {
    const box = document.getElementById("scriptTemplate");
    if (box) box.value = DEFAULT_VOICE_TEMPLATE;
    setCampaignType("dialer");
    updateCampaignPreview();
    updateStartButtonLabel();
  });

  document.getElementById("loadSmsTemplateBtn")?.addEventListener("click", () => {
    const box = document.getElementById("scriptTemplate");
    if (box) box.value = DEFAULT_SMS_TEMPLATE;
    setCampaignType("sms");
    updateCampaignPreview();
    updateStartButtonLabel();
  });

  document.getElementById("saveCampaignBtn")?.addEventListener("click", saveCampaignSettings);
  document.getElementById("startCampaignBtn")?.addEventListener("click", startCampaign);
  document.getElementById("previewRowSelect")?.addEventListener("change", updateCampaignPreview);
  document.getElementById("scriptTemplate")?.addEventListener("input", updateCampaignPreview);

  document.querySelectorAll('input[name="campaignType"]').forEach((el) =>
    el.addEventListener("change", () => {
      updateCampaignPreview();
      updateStartButtonLabel();
    })
  );

document.getElementById("refreshInboxBtn")?.addEventListener("click", loadInbox);
document.getElementById("inboxSearchBox")?.addEventListener("input", loadInbox);
document.getElementById("sendReplyBtn")?.addEventListener("click", sendInboxReply);
document.getElementById("refreshCustomer360Btn")?.addEventListener("click", loadCustomer360);
document.getElementById("customer360SearchBox")?.addEventListener("input", renderCustomer360List);
  initCustomer360TimelineFilters();
  initCustomer360Composer();

// 👇 ADD YOUR COMPOSE LISTENERS HERE
document.getElementById("composeSmsBtn")?.addEventListener("click", openComposeSmsModal);
document.getElementById("floatingComposeBtn")?.addEventListener("click", openComposeSmsModal);
document.getElementById("closeComposeSmsBtn")?.addEventListener("click", closeComposeSmsModal);
document.getElementById("cancelComposeSmsBtn")?.addEventListener("click", closeComposeSmsModal);
document.getElementById("sendComposeSmsBtn")?.addEventListener("click", sendComposedSms);
document.getElementById("composeCustomerSearch")?.addEventListener("input", searchComposeCustomers);

  document.getElementById("refreshSlotsBtn")?.addEventListener("click", refreshAppointmentSlots);
  document.getElementById("apptDate")?.addEventListener("change", async () => {
    await refreshAppointmentSlots();
    await loadSchedulerBoard();
  });
  document.getElementById("apptAdvisor")?.addEventListener("change", async () => {
    await refreshAppointmentSlots();
    await loadSchedulerBoard();
  });
  document.getElementById("bookAppointmentBtn")?.addEventListener("click", bookAppointment);
  document.getElementById("refreshSchedulerBoardBtn")?.addEventListener("click", loadSchedulerBoard);
  document.getElementById("createTaskBtn")?.addEventListener("click", createTask);
  hydrateStandaloneTaskAssignmentFields("service");
  document.getElementById("taskDepartment")?.addEventListener("change", (event) => {
    hydrateStandaloneTaskAssignmentFields(event.target?.value || "service");
  });
  document.getElementById("refreshTasksBtn")?.addEventListener("click", loadTasks);

  document.getElementById("addUserBtn")?.addEventListener("click", () => {
    document.getElementById("usersList")?.appendChild(makeUserRow());
  });

  document.getElementById("addAdvisorBtn")?.addEventListener("click", () => {
    document.getElementById("advisorsList")?.appendChild(makeAdvisorRow());
  });

  document.querySelectorAll("[data-save-section]").forEach((btn) => {
    btn.addEventListener("click", () => saveConfigSection(btn.dataset.saveSection));
  });

  document.getElementById("testFortellisBtn")?.addEventListener("click", testFortellisConnection);

  document.getElementById("refreshCallsBtn")?.addEventListener("click", loadCalls);

  updateStartButtonLabel();
  loadCalls();
  setInterval(loadCalls, 10000);
  loadCampaign();
  loadLastCampaignRun();
  loadInbox();
  loadConfig();
  loadScheduler();
  loadTasks();
  loadCustomer360();
});
