export default async (req) => {
  try {
    if (req.method !== "POST" && req.method !== "PATCH") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const backendUrl = process.env.CSHARP_BACKEND_URL;
    if (!backendUrl) {
      return Response.json({ error: "Missing CSHARP_BACKEND_URL environment variable" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.repairOrderId) {
      return Response.json({ error: "Missing repairOrderId" }, { status: 400 });
    }

    const apiRes = await fetch(`${backendUrl}/api/service/repair-orders/${encodeURIComponent(body.repairOrderId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        status: body.status,
        notes: body.notes,
        closedAtUtc: body.closedAtUtc
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
      return Response.json({ error: data.error || "Failed to update repair order" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("service-repair-order-status error:", err);
    return Response.json({ error: err.message || "Failed to update repair order." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/service-repair-order-status",
};
