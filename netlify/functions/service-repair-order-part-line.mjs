export default async (req) => {
  try {
    if (req.method !== "POST") {
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

    const apiRes = await fetch(`${backendUrl}/api/service/repair-orders/${encodeURIComponent(body.repairOrderId)}/parts-lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });

    const rawText = await apiRes.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json({ error: "Invalid JSON returned by backend" }, { status: 502 });
    }

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to add part line" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("service-repair-order-part-line error:", err);
    return Response.json({ error: err.message || "Failed to add part line." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/service-repair-order-part-line",
};
