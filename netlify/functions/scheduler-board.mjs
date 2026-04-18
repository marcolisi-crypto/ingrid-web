export default async (req) => {
  try {
    const url = new URL(req.url);
    const date =
      url.searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let appointmentsRes;
    try {
      appointmentsRes = await fetch(`${backendUrl}/api/appointments`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await appointmentsRes.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json(
        { error: "Invalid JSON returned by backend" },
        { status: 502 }
      );
    }

    if (!appointmentsRes.ok) {
      return Response.json(
        { error: data.error || "Failed to load appointments from backend" },
        { status: appointmentsRes.status }
      );
    }

    const appointments = Array.isArray(data.appointments)
      ? data.appointments.map((appt) => ({
          id: appt.id || appt.appointmentId || "",
          firstName: appt.firstName || "",
          lastName: appt.lastName || "",
          phone: appt.phone || "",
          email: appt.email || "",
          make: appt.make || "",
          model: appt.model || "",
          year: appt.year || "",
          vin: appt.vin || "",
          mileage: appt.mileage || "",
          service: appt.service || appt.serviceType || "",
          advisor: appt.advisor || appt.advisorName || "",
          date: appt.date || date,
          time: appt.time || "",
          transport: appt.transport || "",
          notes: appt.notes || "",
          confirmationNumber:
            appt.confirmationNumber || appt.confirmationId || "",
          createdAt: appt.createdAt || appt.updatedAt || "",
        }))
        .filter((appt) => (appt.date || "") === date)
      : [];

    const advisorNames = [...new Set(appointments.map((appt) => appt.advisor).filter(Boolean))];
    const advisors = advisorNames.map((name) => ({
      name,
      department: "service",
      email: "",
      extension: "",
      active: true,
      bookableOnline: true,
      color: "",
    }));

    const slots = [...new Set(appointments.map((appt) => appt.time).filter(Boolean))];

    if (!slots.length) {
      slots.push("08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30");
    }

    return Response.json({
      date,
      closed: false,
      slots,
      advisors,
      appointments,
    });
  } catch (err) {
    console.error("scheduler-board error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to load scheduler board.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/scheduler-board",
};
