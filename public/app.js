let selectedCallSid = null;
let currentCalls = [];
let currentRows = [];
let currentInboxConversations = [];
let currentTasks = [];
let currentAppointments = [];
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
let currentCustomer360ComposerMode = "note";

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

function buildVinArchiveItems(vehicle, customer, calls = [], notes = [], appointments = []) {
  const vinLabel = vehicle?.vin || "VIN pending";
  const serviceDate = appointments[0]?.date || "Next available";
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
      meta: `${calls.length || 2} media items • Customer proof set`
    },
    {
      icon: "🛠",
      title: "Service History",
      meta: `Next lane touchpoint ${serviceDate}`
    }
  ];
}

function buildLensArchiveItems(vehicle, customer, calls = [], notes = [], appointments = []) {
  if (currentDepartmentLens === "sales") {
    return [
      { icon: "💰", title: "Quote Pack", meta: `${vehicleDisplayName(vehicle)} pricing worksheet` },
      { icon: "🚗", title: "Trade Walkaround", meta: `${calls.length || 1} sales touchpoints logged` },
      { icon: "🧾", title: "Credit + F&I Prep", meta: `${customerDisplayName(customer)} delivery checklist` },
      { icon: "📸", title: "Merchandising Media", meta: `Vehicle media set ready for handoff` }
    ];
  }

  if (currentDepartmentLens === "bdc") {
    return [
      { icon: "💬", title: "Conversation History", meta: `${calls.length} calls/SMS linked to this customer` },
      { icon: "📋", title: "Lead Notes", meta: `${notes.length || 1} notes available for the next agent` },
      { icon: "📞", title: "Callback Packet", meta: `Preferred number ${customer?.phones?.[0] || "not set"}` },
      { icon: "🗂", title: "Customer Profile", meta: `${customerDisplayName(customer)} communication archive` }
    ];
  }

  if (currentDepartmentLens === "technicians") {
    return [
      { icon: "🧰", title: "Inspection Packet", meta: `${vehicleDisplayName(vehicle)} MPI + repair notes` },
      { icon: "📸", title: "Technician Media", meta: `${notes.length || 1} annotated photos or findings queued` },
      { icon: "📦", title: "Parts Pick Ticket", meta: `${appointments.length ? "Linked to active lane visit" : "Ready once RO is written"}` },
      { icon: "🗂", title: "VIN History", meta: `${customerDisplayName(customer)} prior service evidence` }
    ];
  }

  if (currentDepartmentLens === "parts") {
    return [
      { icon: "📦", title: "Stock Pull Sheet", meta: `${vehicleDisplayName(vehicle)} pick list and shelf route` },
      { icon: "🤖", title: "Runner Dispatch", meta: `${calls.length || 1} handoff signals for technician delivery` },
      { icon: "🧾", title: "Special Order Packet", meta: `${notes.length || 1} notes tied to ETA and vendor status` },
      { icon: "🗂", title: "Core Return File", meta: `${customerDisplayName(customer)} parts-side archive` }
    ];
  }

  if (currentDepartmentLens === "accounting") {
    return [
      { icon: "💳", title: "Payment Record", meta: `${customerDisplayName(customer)} payment and refund evidence` },
      { icon: "🧾", title: "Invoice Packet", meta: `${vehicleDisplayName(vehicle)} statement and line items` },
      { icon: "📚", title: "Ledger Trail", meta: `${notes.length || 1} internal accounting notes` },
      { icon: "🏦", title: "Settlement File", meta: `Stripe / QuickBooks-style reconciliation packet` }
    ];
  }

  return buildVinArchiveItems(vehicle, customer, calls, notes, appointments);
}

function buildLensServiceLaneMarkup(customer, vehicle, topTask, appointments = [], calls = []) {
  const nextAppointment = appointments[0];
  const missedCalls = calls.filter((call) => String(call.status || "").toLowerCase().includes("miss")).length;

  if (currentDepartmentLens === "bdc") {
    return `
      <div class="customer360-service-card">
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
            <div class="customer360-service-copy">${escapeHtml(topTask?.description || "Use SMS or voice to move the customer into a confirmed next step.")}</div>
          </div>
          <span class="customer360-status-pill info">BDC</span>
        </div>
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('task')">Queue Follow-Up</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="openSmsForPhone(getSelectedCustomerPrimaryPhone())">Open SMS Dock</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "sales") {
    return `
      <div class="customer360-service-card">
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
            <div class="customer360-service-copy">${nextAppointment ? `${escapeHtml(nextAppointment.date || "")} ${escapeHtml(nextAppointment.time || "")}` : "Move this lead toward an in-store appointment or quote review."}</div>
          </div>
          <span class="customer360-status-pill info">Sales</span>
        </div>
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('task')">Open Deal Task</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('appointment')">Schedule Visit</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "technicians") {
    return `
      <div class="customer360-service-card">
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
          ${topTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="completeTask('${escapeHtml(topTask.id)}')">Close Work Step</button>` : ""}
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('note')">Add Inspection Note</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "parts") {
    return `
      <div class="customer360-service-card">
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
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('task')">Create Pick Task</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('note')">Log Parts Note</button>
        </div>
      </div>
    `;
  }

  if (currentDepartmentLens === "accounting") {
    return `
      <div class="customer360-service-card">
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
            <div class="customer360-service-copy">${topTask ? "Open accounting work suggests a statement, invoice, or collection follow-up is active." : "Use this rail for invoice, payment, refund, and statement workflows."}</div>
          </div>
          <span class="customer360-status-pill info">Accounting</span>
        </div>
        <div class="customer360-service-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startLedgerNote()">Add Ledger Note</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="queueAccountingInvoiceReview()">Queue Invoice Task</button>
        </div>
      </div>
    `;
  }

  const loanerState = String(getDepartmentLensConfig().name).toLowerCase().includes("service") || !!nextAppointment
    ? "Suggested"
    : "Standby";
  return `
    <div class="customer360-service-card">
      <div class="customer360-service-row">
        <div>
          <div class="customer360-service-label">Lane Status</div>
          <div class="customer360-service-value">${nextAppointment ? "Appointment Ready" : "Pre-Arrival"}</div>
          <div class="customer360-service-copy">${nextAppointment ? `${escapeHtml(nextAppointment.service || "Service visit")} with ${escapeHtml(nextAppointment.advisor || "First Available")}` : "No service booking yet. Use the 360 composer to book the next lane event."}</div>
        </div>
        <span class="customer360-status-pill ${nextAppointment ? "good" : "info"}">${nextAppointment ? "Booked" : "Open"}</span>
      </div>
      <div class="customer360-service-row">
        <div>
          <div class="customer360-service-label">Loaner Desk</div>
          <div class="customer360-service-value">${loanerState}</div>
          <div class="customer360-service-copy">${appointments.length ? "Advisor should confirm transportation needs before write-up." : "Reserve later if diagnostics expand into all-day work."}</div>
        </div>
        <span class="customer360-status-pill ${loanerState === "Suggested" ? "warn" : "info"}">${loanerState}</span>
      </div>
      <div class="customer360-service-row">
        <div>
          <div class="customer360-service-label">Open Follow-Up</div>
          <div class="customer360-service-value">${escapeHtml(topTask?.title || "No active task")}</div>
          <div class="customer360-service-copy">${escapeHtml(topTask?.description || "A technician or advisor task will surface here once work begins.")}</div>
        </div>
        ${topTask ? `<span class="customer360-status-pill info">${escapeHtml(topTask.priority || "normal")}</span>` : `<span class="customer360-status-pill good">Clear</span>`}
      </div>
      <div class="customer360-service-actions">
        ${topTask ? `<button class="customer360-toolbar-btn" style="width:100%;" onclick="completeTask('${escapeHtml(topTask.id)}')">Mark Task Complete</button>` : ""}
        <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('appointment')">Open Service Composer</button>
      </div>
    </div>
  `;
}

function buildLensPanelMarkup(customer, vehicle, tasks = [], notes = [], appointments = [], calls = []) {
  const topTask = tasks[0];
  const nextAppointment = appointments[0];
  const missedCalls = calls.filter((call) => String(call.status || "").toLowerCase().includes("miss")).length;
  const latestNote = notes[0];
  const contactPhone = customer?.phones?.[0] || "Not set";
  const vehicleName = vehicleDisplayName(vehicle);

  if (currentDepartmentLens === "service") {
    return `
      <div class="customer360-lens-card">
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Repair Order</div>
          <div class="customer360-lens-value">${vehicle?.vin ? `RO-lite • ${escapeHtml(vehicle.vin.slice(-6))}` : "RO-lite pending"}</div>
          <div class="customer360-lens-copy">Primary concern: ${escapeHtml(topTask?.description || nextAppointment?.service || "Customer concern not written yet.")}</div>
        </div>
        <div class="customer360-lens-grid">
          <div class="customer360-lens-stat">
            <small>Lane Check-In</small>
            <strong>${nextAppointment ? "Customer expected" : "Needs arrival slot"}</strong>
            <span>${nextAppointment ? `${escapeHtml(nextAppointment.service || "Service visit")} queued for advisor write-up.` : "Use Schedule Service to set the arrival window and advisor ownership."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Loaner Board</small>
            <strong>${appointments.length ? "Review eligibility" : "Standby"}</strong>
            <span>${appointments.length ? "Transportation should be confirmed before diagnostics turn into all-day work." : "No transportation request has been captured yet."}</span>
          </div>
        </div>
        <div class="customer360-lens-row">
          <div class="customer360-lens-label">Promised Time</div>
          <div class="customer360-lens-value">${nextAppointment ? `${escapeHtml(nextAppointment.date || "")} ${escapeHtml(nextAppointment.time || "")}` : "Awaiting booking"}</div>
          <div class="customer360-lens-copy">Use this area to evolve into lane check-in, write-up, and promised-time control.</div>
        </div>
        <div class="customer360-lens-checklist">
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">1</span>
            <div><b>Verify concern</b><span>${escapeHtml(topTask?.title || "Capture warning light / complaint in advisor notes.")}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">2</span>
            <div><b>Confirm transportation</b><span>${appointments.length ? "Offer shuttle or loaner before write-up closes." : "Transportation need has not been answered yet."}</span></div>
          </div>
          <div class="customer360-lens-check">
            <span class="customer360-lens-check-mark">3</span>
            <div><b>Set promised time</b><span>${nextAppointment ? "Promised-time placeholder is present and ready for advisor control." : "No promised time until service visit is booked."}</span></div>
          </div>
        </div>
        <div class="customer360-lens-actions">
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startServiceWriteUp()">Write Service Visit</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startAdvisorJourneyNote()">Add Advisor Note</button>
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
            <strong>${missedCalls ? "Due in 15 min" : "Within target"}</strong>
            <span>${missedCalls ? "Missed contacts should move to the top of the callback queue." : "Current thread is warm and does not need rescue cadence yet."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Campaign Source</small>
            <strong>${latestNote ? "Warranty inquiry" : "Inbound lead"}</strong>
            <span>${latestNote ? "Recent notes suggest campaign-style follow-up and appointment conversion." : "Use this area later for source attribution and campaign routing."}</span>
          </div>
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
            <strong>${notes.length ? "Worksheet in progress" : "Not issued"}</strong>
            <span>${notes.length ? "Recent notes imply the customer is already in pricing discussion." : "This area can evolve into live quote, payment, and F&I menu surfaces."}</span>
          </div>
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
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="setCustomer360ComposerMode('appointment')">Schedule Test Drive</button>
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
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startTechnicianInspectionNote()">Log Technician Finding</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="createTechnicianPartsRequest()">Request Parts</button>
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
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="createPartsPickTask()">Create Parts Task</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startPartsEtaNote()">Add ETA Note</button>
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
            <strong>${topTask ? "Needs review" : "Draft-ready"}</strong>
            <span>${topTask ? "An open accounting task suggests invoice posting or statement follow-up is still pending." : "Use this block for modern QuickBooks-style invoice and statement flow."}</span>
          </div>
          <div class="customer360-lens-stat">
            <small>Payment Rail</small>
            <strong>Stripe linked</strong>
            <span>Card, refund, and statement workflows can eventually settle here with QuickBooks-style bookkeeping posture.</span>
          </div>
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
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="queueAccountingInvoiceReview()">Queue Invoice Review</button>
          <button class="customer360-toolbar-btn" style="width:100%;" onclick="startLedgerNote()">Add Ledger Note</button>
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
  const followUp = nextAppointment
    ? `${nextAppointment.service || "service"} appointment recommended`
    : nextTask
      ? `${nextTask.title || "follow-up task"} recommended`
      : "follow-up recommended";
  return `${customerName} contacted the dealership regarding ${vehicleName}. Latest context: ${callDetail}. ${followUp}.`;
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

function startTechnicianInspectionNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nInspection finding:\n- \nRecommended action:\n- \nMedia captured:\n- `,
    status: "Inspection note template loaded."
  });
}

function createTechnicianPartsRequest() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: vehicle ? `${vehicleDisplayName(vehicle)} parts request` : `${customerDisplayName(customer)} parts request`,
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nPart needed:\nVIN match checked:\nDelivery target:\nSend to: Technician bay / runner`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Parts request task template loaded."
  });
}

function createPartsPickTask() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: vehicle ? `${vehicleDisplayName(vehicle)} stock pull` : `${customerDisplayName(customer)} stock pull`,
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nRequested part / SKU:\nFitment checked:\nSource: Stock / Transfer / Special order\nDelivery route: Counter / Bay / Runner`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Parts pick task template loaded."
  });
}

function startPartsEtaNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nParts ETA update:\n- Source:\n- ETA:\n- Runner / delivery notes:\n- `,
    status: "Parts ETA note template loaded."
  });
}

function queueAccountingInvoiceReview() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("task", {
    title: vehicle ? `${vehicleDisplayName(vehicle)} invoice review` : `${customerDisplayName(customer)} invoice review`,
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nInvoice review:\n- Charges validated:\n- Payment request:\n- Statement status:\n- Reconciliation notes:`,
    dueAt: toLocalDateInputValue(new Date()),
    status: "Invoice review task template loaded."
  });
}

function startLedgerNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nLedger note:\n- Payment status:\n- Statement update:\n- Refund / credit notes:\n- Reconciliation comment:`,
    status: "Ledger note template loaded."
  });
}

function buildTechnicianTasksMarkup(openTasks = [], vehicle) {
  const inspectionStages = [
    {
      title: "Digital inspection",
      detail: openTasks[0]?.title || `Open findings for ${vehicleDisplayName(vehicle)}`,
      tone: openTasks.length ? "info" : "warn"
    },
    {
      title: "Parts handoff",
      detail: openTasks.length ? "Queue robot runner or parts counter request" : "No active parts request yet",
      tone: openTasks.length ? "warn" : "good"
    },
    {
      title: "Advisor approval",
      detail: "Return recommendation and media to the advisor timeline",
      tone: "info"
    }
  ];

  return inspectionStages.map((stage) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(stage.title)}</strong>
        <div class="customer360-meta">${escapeHtml(stage.detail)}</div>
      </div>
      <span class="customer360-status-pill ${stage.tone}">${stage.tone === "warn" ? "Watch" : stage.tone === "good" ? "Ready" : "Live"}</span>
    </div>
  `).join("");
}

function buildTechnicianNotesMarkup(notes = [], calls = []) {
  const mediaRows = [
    {
      label: "Photo set",
      detail: notes.length ? `${notes.length} findings ready for advisor review` : "Start with under-vehicle or concern-area photos"
    },
    {
      label: "Video walkthrough",
      detail: calls.length ? "Customer communication exists for context handoff" : "No customer-facing walkthrough recorded yet"
    },
    {
      label: "Approval return",
      detail: "Push technician findings back into the advisor/customer timeline"
    }
  ];

  return mediaRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <button class="customer360-panel-action">•</button>
    </div>
  `).join("");
}

function buildPartsTasksMarkup(openTasks = [], appointments = [], vehicle) {
  const sourcingRows = [
    {
      title: "Stock pull",
      detail: openTasks[0]?.title || `Open pick flow for ${vehicleDisplayName(vehicle)}`,
      tone: openTasks.length ? "warn" : "info"
    },
    {
      title: "Source decision",
      detail: openTasks.length ? "Choose in-stock, transfer, or special order" : "No active SKU routing yet",
      tone: openTasks.length ? "info" : "good"
    },
    {
      title: "Dispatch",
      detail: appointments.length ? "Runner can route to active bay" : "Stage at counter until bay is ready",
      tone: appointments.length ? "warn" : "info"
    }
  ];

  return sourcingRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <span class="customer360-status-pill ${row.tone}">${row.tone === "warn" ? "Watch" : row.tone === "good" ? "Ready" : "Live"}</span>
    </div>
  `).join("");
}

function buildPartsNotesMarkup(notes = [], appointments = []) {
  const dispatchRows = [
    {
      label: "ETA updates",
      detail: notes.length ? `${notes.length} parts-side notes captured for customer follow-up` : "No ETA note has been recorded yet"
    },
    {
      label: "Runner dispatch",
      detail: appointments.length ? "Bay delivery can be queued against the active visit" : "No active lane visit, so keep dispatch staged"
    },
    {
      label: "Vendor status",
      detail: "Track transfer, special order, and backorder posture here"
    }
  ];

  return dispatchRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <button class="customer360-panel-action">•</button>
    </div>
  `).join("");
}

function buildAccountingTasksMarkup(openTasks = [], vehicle) {
  const ledgerRows = [
    {
      title: "Invoice review",
      detail: openTasks[0]?.title || `Review charges for ${vehicleDisplayName(vehicle)}`,
      tone: openTasks.length ? "warn" : "info"
    },
    {
      title: "Payment request",
      detail: openTasks.length ? "Stripe collection or statement follow-up is active" : "No active collection workflow yet",
      tone: openTasks.length ? "info" : "good"
    },
    {
      title: "Reconciliation",
      detail: "Close ledger loop against service, parts, and delivery activity",
      tone: "info"
    }
  ];

  return ledgerRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <span class="customer360-status-pill ${row.tone}">${row.tone === "warn" ? "Watch" : row.tone === "good" ? "Ready" : "Live"}</span>
    </div>
  `).join("");
}

function buildAccountingNotesMarkup(notes = []) {
  const statementRows = [
    {
      label: "Statement status",
      detail: notes.length ? `${notes.length} accounting notes available for customer statement context` : "No statement notes captured yet"
    },
    {
      label: "Payment rail",
      detail: "Stripe-backed payment, refund, and collection posture should sit here"
    },
    {
      label: "Reconciliation trail",
      detail: "Keep QuickBooks-style ledger comments tied to the same customer + VIN record"
    }
  ];

  return statementRows.map((row) => `
    <div class="customer360-panel-item">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <div class="customer360-meta">${escapeHtml(row.detail)}</div>
      </div>
      <button class="customer360-panel-action">•</button>
    </div>
  `).join("");
}

function getJourneyArtifactTag() {
  if (currentDepartmentLens === "service") return "[SERVICE]";
  if (currentDepartmentLens === "technicians") return "[TECHNICIAN]";
  if (currentDepartmentLens === "parts") return "[PARTS]";
  if (currentDepartmentLens === "accounting") return "[ACCOUNTING]";
  return "";
}

function getJourneyArtifactLabel() {
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

function startServiceWriteUp() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("appointment", {
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nWrite-up summary:\n- Concern:\n- Promised time:\n- Transportation:\n- Advisor notes:`,
    status: "Service write-up template loaded."
  });
}

function startAdvisorJourneyNote() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  presetCustomer360Composer("note", {
    body: `${customerDisplayName(customer)} • ${vehicleDisplayName(vehicle)}\nAdvisor follow-up:\n- Concern verified:\n- Next action for technician:\n- Customer expectation:`,
    status: "Advisor note template loaded."
  });
}

function hasKeywordMatch(items = [], keywords = []) {
  return items.some((item) => {
    const haystack = `${item.title || ""} ${item.description || ""} ${item.body || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

function buildServiceJourneyState(tasks = [], notes = [], appointments = []) {
  const serviceReady = appointments.length > 0;
  const techReady = hasKeywordMatch(tasks, ["[technician]", "diagn", "inspect", "tech", "repair"]) || hasKeywordMatch(notes, ["[technician]", "inspection", "finding", "diagn"]);
  const partsReady = hasKeywordMatch(tasks, ["[parts]", "part", "stock", "sku", "runner"]) || hasKeywordMatch(notes, ["[parts]", "eta", "part", "stock", "runner"]);
  const accountingReady = hasKeywordMatch(tasks, ["[accounting]", "invoice", "payment", "statement", "ledger"]) || hasKeywordMatch(notes, ["[accounting]", "statement", "ledger", "payment", "refund"]);

  const stages = [
    {
      key: "service",
      label: "Service Advisor",
      detail: serviceReady ? "Visit booked and ready for write-up." : "Book visit and set promised time.",
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
  ];

  const activeStage = stages.find((stage) => stage.status === "active") || stages[0];
  const overallStatus = accountingReady
    ? "Back office in motion"
    : partsReady
      ? "Parts engaged"
      : techReady
        ? "In technician flow"
        : serviceReady
          ? "Lane ready"
          : "Waiting";

  return { stages, activeStage, overallStatus };
}

function renderCustomer360Journey(tasks = [], notes = [], appointments = []) {
  const stagesEl = document.getElementById("customer360JourneyStages");
  const actionsEl = document.getElementById("customer360JourneyActions");
  const statusEl = document.getElementById("customer360JourneyStatus");
  if (!stagesEl || !actionsEl || !statusEl) return;

  const { stages, activeStage, overallStatus } = buildServiceJourneyState(tasks, notes, appointments);
  statusEl.textContent = overallStatus;
  statusEl.className = `customer360-status-pill ${overallStatus === "Waiting" ? "info" : overallStatus.includes("technician") || overallStatus.includes("Lane") ? "warn" : "good"}`;

  stagesEl.innerHTML = stages.map((stage) => `
    <div class="customer360-journey-stage">
      <div class="customer360-journey-stage-top">
        <b>${escapeHtml(stage.label)}</b>
        <span class="customer360-status-pill ${stage.status === "complete" ? "good" : stage.status === "active" ? "warn" : "info"}">${stage.status === "complete" ? "Done" : stage.status === "active" ? "Now" : "Next"}</span>
      </div>
      <span>${escapeHtml(stage.detail)}</span>
    </div>
  `).join("");

  actionsEl.innerHTML = stages.map((stage) => `
    <button type="button" class="customer360-journey-btn ${currentDepartmentLens === stage.key ? "active" : ""}" onclick="setDepartmentLens('${escapeHtml(stage.key)}')">${escapeHtml(stage.label)}</button>
  `).join("");

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
  const contextName = document.getElementById("customer360ContextName");
  const contextCopy = document.getElementById("customer360ContextCopy");
  const toolbarMeta = document.getElementById("customer360ToolbarMeta");
  const summaryTitle = document.getElementById("customer360SummaryTitle");
  const timelineLens = document.getElementById("customer360TimelineLens");
  const mainTitle = document.getElementById("customer360MainTitle");
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
  if (mainTitle) mainTitle.textContent = config.dashboardTitle || "Customer 360° Dashboard";
  if (lensPanelTitle) lensPanelTitle.textContent = config.lensPanelTitle || "Work Queue";
  if (primaryPanelTitle) primaryPanelTitle.textContent = config.primaryPanelTitle || "Tasks";
  if (secondaryPanelTitle) secondaryPanelTitle.textContent = config.secondaryPanelTitle || "Notes";
  if (railTitle) railTitle.textContent = config.railTitle || "Service + Loaner";
  if (archiveTitle) archiveTitle.textContent = config.archiveTitle || "VIN Archive";

  actions.forEach((el, index) => {
    if (!el) return;
    const iconEl = el.querySelector(".customer360-action-icon");
    const label = config.actions[index] || "Action";
    el.innerHTML = `<span><span class="customer360-action-icon">${iconEl?.textContent || "◔"}</span> ${escapeHtml(label)}</span><span>›</span>`;
  });
}

function setDepartmentLens(department = "home") {
  currentDepartmentLens = DEPARTMENT_LENSES[department] ? department : "home";
  const config = getDepartmentLensConfig();

  document.querySelectorAll(".department-menu-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.department === currentDepartmentLens);
  });
  syncCustomer360LensUi();
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

  hydrateCustomer360AppointmentFields();

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
}

function renderCustomer360Timeline() {
  const timelineEl = document.getElementById("customer360Timeline");
  if (!timelineEl) return;

  const filter = normalizeCustomer360TimelineFilter(currentCustomer360TimelineFilter);
  const items = currentCustomer360TimelineCards.filter((item) => {
    if (filter === "all") return true;
    return categorizeCustomer360TimelineItem(item) === filter;
  });

  if (!items.length) {
    timelineEl.innerHTML = `<div class="customer360-empty">No ${escapeHtml(filter === "activity" ? "additional activity" : filter)} on this timeline yet.</div>`;
    return;
  }

  timelineEl.innerHTML = items.map((item) => `
    <div class="customer360-timeline-item">
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
      </div>
    </div>
  `).join("");
}

function initCustomer360TimelineFilters() {
  document.querySelectorAll(".customer360-filter-chip[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentCustomer360TimelineFilter = normalizeCustomer360TimelineFilter(chip.dataset.filter || "all");
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
}

async function createCustomer360Task() {
  const customer = getSelectedCustomerRecord();
  const vehicle = getSelectedVehicleRecord();
  const body = stampJourneyArtifact(getValue("customer360ComposerBody").trim());
  const title = stampJourneyArtifact(getValue("customer360TaskTitle").trim());
  if (!customer) throw new Error("Select a customer before creating a task.");

  const res = await fetch("/.netlify/functions/tasks-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      title: title || "Customer follow-up",
      description: body,
      priority: "normal",
      dueAtUtc: getValue("customer360TaskDueAt") ? new Date(getValue("customer360TaskDueAt")).toISOString() : null
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create task");
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
}

async function submitCustomer360Composer() {
  try {
    setCustomer360ComposerStatus("Saving...");
    if (currentCustomer360ComposerMode === "task") {
      await createCustomer360Task();
    } else if (currentCustomer360ComposerMode === "appointment") {
      await createCustomer360Appointment();
    } else {
      await createCustomer360Note();
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
  } catch (err) {
    setCustomer360ComposerStatus(err.message || "Unable to save.", "error");
  }
}


function renderCustomer360Detail() {
  const customer = currentCustomers.find((item) => item.id === selectedCustomerId);
  const vehicle = getCustomerPrimaryVehicle(customer);
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
  const archiveCount = currentCustomerNotes.length + currentCustomerTimeline.length + calls.length;
  const aiSummary = buildCustomerAiSummary(customer, vehicle, calls, currentCustomerTimeline, tasks, appointments);

  const summaryTitleEl = document.getElementById("customer360SummaryTitle");
  const customerCardEl = document.getElementById("customer360CustomerCard");
  const aiSummaryEl = document.getElementById("customer360AiSummary");
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

  if (!customer) {
    currentCustomer360TimelineCards = [];
    if (summaryTitleEl) summaryTitleEl.textContent = getDepartmentLensConfig().summaryTitle || "AI Summary";
    if (customerCardEl) customerCardEl.innerHTML = `<div class="customer360-empty">Select a customer to load the 360 dashboard.</div>`;
    if (aiSummaryEl) aiSummaryEl.textContent = "Select a customer to generate a timeline-aware summary.";
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
    return;
  }

  if (summaryTitleEl) {
    summaryTitleEl.textContent = `${getDepartmentLensConfig().summaryTitle || "AI Summary"}: ${customerDisplayName(customer)}`;
  }

  if (customerCardEl) {
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
  }

  if (aiSummaryEl) {
    const lens = getDepartmentLensConfig();
    aiSummaryEl.textContent = `${lens.name}: ${aiSummary}`;
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
      <div class="customer360-vehicle-line"><span>VIN:</span><strong>${escapeHtml(vehicle.vin || "Unknown")}</strong></div>
      <div class="customer360-vehicle-line"><span>Geo:</span><strong>${escapeHtml(vehicle.status || "Inventory Live")}</strong></div>
      <div class="customer360-vehicle-line"><span>Battery Health:</span><strong class="customer360-vehicle-good">${escapeHtml(batteryState)}</strong></div>
      <div class="customer360-vehicle-line"><span>Recalls:</span><strong>${escapeHtml(recallState)}</strong></div>
      <div class="customer360-vehicle-line"><span>Maintenance:</span><strong class="customer360-vehicle-warn">${escapeHtml(maintenanceState === "Scheduled" ? "Due Soon" : maintenanceState)}</strong></div>
      <div class="customer360-vehicle-line"><span>Loaner:</span><strong>${appointments.length ? "Potentially needed" : "Not requested"}</strong></div>
      <div class="customer360-geo-card">
        <strong>${escapeHtml(inferVehicleGeoLabel(vehicle, customer))}</strong>
        <span>Geo-enabled inventory anchor for ${escapeHtml(vehicleDisplayName(vehicle))} tied to the VIN archive, service lane, and technician dispatch flow.</span>
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
    if (currentDepartmentLens === "technicians") {
      tasksBoardEl.innerHTML = buildTechnicianTasksMarkup(openTasks, vehicle);
    } else if (currentDepartmentLens === "parts") {
      tasksBoardEl.innerHTML = buildPartsTasksMarkup(openTasks, appointments, vehicle);
    } else if (currentDepartmentLens === "accounting") {
      tasksBoardEl.innerHTML = buildAccountingTasksMarkup(openTasks, vehicle);
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
        <button class="customer360-panel-action">•</button>
      </div>
    `).join("") : `<div class="customer360-empty">${emptyTaskCopy}</div>`;
    }
  }

  if (notesBoardEl) {
    if (currentDepartmentLens === "technicians") {
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
        <button class="customer360-panel-action">•</button>
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
    filesPanelEl.innerHTML = `
      <div class="customer360-panel-item" style="border-top:none;padding-top:0;">
        <span>${escapeHtml(vehicle?.vin || "VIN pending")}</span>
        <span class="customer360-contact-pill">${archiveCount} files</span>
      </div>
      <div class="customer360-archive-list">
        ${archiveItems.map((item) => `
          <div class="customer360-archive-item">
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
      time: formatDisplayDateTime(calls[0].startedAt || calls[0].updatedAt),
      body: calls[0].notes || calls[0].transcript || "Spoke with the customer about a recent vehicle concern.",
      subcopy: `${titleCase(calls[0].status || "completed")} • ${titleCase(calls[0].routedDepartment || "communications")}`
    });
  }

  const latestTimeline = currentCustomerTimeline.slice(0, 4).map((event) => ({
    type: titleCase(event.title || event.eventType || "Timeline Event"),
    eventType: event.eventType || "activity",
    time: formatDisplayDateTime(event.occurredAtUtc || event.createdAtUtc),
    body: event.body || "Timeline detail captured.",
    subcopy: `${titleCase(event.department || event.sourceSystem || "ingrid")}`
  }));

  latestTimeline.forEach((event) => timelineCards.push(event));

  if (appointments[0]) {
    timelineCards.push({
      type: "Service Event",
      eventType: "appointments",
      time: `${appointments[0].date || ""} ${appointments[0].time || ""}`.trim() || "Upcoming",
      body: `${appointments[0].service || "Service appointment"}${appointments[0].advisor ? ` with ${appointments[0].advisor}` : ""}`,
      actions: [
        { label: "Schedule Service", accent: true },
        { label: appointments[0].date && appointments[0].time ? `${appointments[0].date} ${appointments[0].time}` : "Tomorrow at 10:00 AM", light: true }
      ]
    });
  }

  if (openTasks[0]) {
    timelineCards.push({
      type: "Task",
      eventType: "tasks",
      time: formatDisplayDateTime(openTasks[0].updatedAtUtc || openTasks[0].createdAtUtc || new Date().toISOString()),
      body: openTasks[0].description || openTasks[0].title || "Follow up with the customer.",
      subcopy: `Follow Up: ${openTasks[0].title || "Customer confirmation"}`
    });
  }

  if (currentCustomerNotes[0]) {
    timelineCards.push({
      type: "Note",
      eventType: "notes",
      time: formatDisplayDateTime(currentCustomerNotes[0].updatedAtUtc || currentCustomerNotes[0].createdAtUtc),
      body: currentCustomerNotes[0].body || "Recent note captured in the customer record.",
      subcopy: titleCase(currentCustomerNotes[0].noteType || "internal")
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
