export default async (req) => {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || "";
    const advisor = url.searchParams.get("advisor") || "";

    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (advisor) params.set("advisor", advisor);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let apiRes;
    try {
      apiRes = await fetch(
        `${backendUrl}/api/appointments/slots?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );
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
    console.warn("Appointment slots API returned non-OK status:", apiRes.status);
    return Response.json({
      slots: [],
      message: "Appointment slots not implemented yet"
    });
  }

    const slots = Array.isArray(data.slots) ? data.slots : [];

    return Response.json({ slots });
  } catch (err) {
    console.error("appointment-slots error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to load appointment slots.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/appointment-slots",
};
