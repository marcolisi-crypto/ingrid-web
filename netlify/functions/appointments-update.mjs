export default async (req) => {
  try {
    if (req.method !== "PATCH" && req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const backendUrl = process.env.CSHARP_BACKEND_URL;
    if (!backendUrl) {
      return Response.json({ error: "Missing CSHARP_BACKEND_URL environment variable" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const appointmentId = body.appointmentId;
    if (!appointmentId) {
      return Response.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const apiRes = await fetch(`${backendUrl}/api/appointments/${encodeURIComponent(appointmentId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        advisor: body.advisor || "",
        status: body.status || "",
        transport: body.transport || "",
        notes: body.notes || ""
      })
    });

    const rawText = await apiRes.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json({ error: "Invalid JSON returned by backend" }, { status: 502 });
    }

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to update appointment" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("appointments-update error:", err);
    return Response.json({ error: err.message || "Failed to update appointment." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/appointments-update",
};
