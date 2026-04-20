export default async (req) => {
  try {
    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json({ error: "Missing CSHARP_BACKEND_URL environment variable" }, { status: 500 });
    }

    const url = new URL(req.url);
    const params = new URLSearchParams();
    ["customerId", "vehicleId", "status"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    });

    const apiRes = await fetch(`${backendUrl}/api/service/repair-orders?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const rawText = await apiRes.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json({ error: "Invalid JSON returned by backend" }, { status: 502 });
    }

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load repair orders" }, { status: apiRes.status });
    }

    return Response.json({ repairOrders: Array.isArray(data.repairOrders) ? data.repairOrders : [] });
  } catch (err) {
    console.error("service-repair-orders-list error:", err);
    return Response.json({ error: err.message || "Failed to load repair orders." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/service-repair-orders-list",
};
