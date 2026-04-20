import { getBackendUrl, parseBackendJson } from "./lib/backend.mjs";

export default async (req) => {
  try {
    const backendUrl = getBackendUrl();
    const url = new URL(req.url);
    const params = new URLSearchParams();
    const repairOrderId = url.searchParams.get("repairOrderId");
    if (repairOrderId) params.set("repairOrderId", repairOrderId);

    const apiRes = await fetch(`${backendUrl}/api/parts/orders?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await parseBackendJson(apiRes);
    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load part orders" }, { status: apiRes.status });
    }

    return Response.json({ orders: Array.isArray(data.orders) ? data.orders : [] });
  } catch (err) {
    console.error("parts-orders-list error:", err);
    return Response.json({ error: err.message || "Failed to load part orders." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/parts-orders-list",
};
