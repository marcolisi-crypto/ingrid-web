export default async () => {
  try {
    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let apiRes;
    try {
      apiRes = await fetch(`${backendUrl}/api/appointments`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await apiRes.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json(
        { error: "Invalid JSON returned by backend" },
        { status: 502 }
      );
    }

    if (!apiRes.ok) {
    console.warn("Appointments API returned non-OK status:", apiRes.status);
    return Response.json({
      appointments: [],
      message: "Appointments not implemented yet"
    });
  }

    const appointments = Array.isArray(data.appointments)
      ? data.appointments
      : [];

    const normalizedAppointments = appointments
      .map((item) => ({
        id: item.id || item.appointmentId || "",
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        phone: item.phone || "",
        email: item.email || "",
        make: item.make || "",
        model: item.model || "",
        year: item.year || "",
        vin: item.vin || "",
        mileage: item.mileage || "",
        service: item.service || item.serviceType || "",
        advisor: item.advisor || item.advisorName || "",
        date: item.date || "",
        time: item.time || "",
        transport: item.transport || "",
        notes: item.notes || "",
        confirmationNumber:
          item.confirmationNumber || item.confirmationId || "",
        createdAt:
          item.createdAt ||
          item.updatedAt ||
          "",
      }))
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

    return Response.json({
      appointments: normalizedAppointments,
    });
  } catch (err) {
    console.error("appointments-list error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to load appointments.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/appointments-list",
};
