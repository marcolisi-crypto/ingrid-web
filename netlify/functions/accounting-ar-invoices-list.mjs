import { getBackendUrl, parseBackendJson } from "./lib/backend.mjs";

export default async (req) => {
  try {
    const backendUrl = getBackendUrl();
    const url = new URL(req.url);
    const params = new URLSearchParams();
    const repairOrderId = url.searchParams.get("repairOrderId");
    if (repairOrderId) params.set("repairOrderId", repairOrderId);

    const apiRes = await fetch(`${backendUrl}/api/accounting/ar/invoices?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await parseBackendJson(apiRes);
    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load AR invoices" }, { status: apiRes.status });
    }

    return Response.json({ invoices: Array.isArray(data.invoices) ? data.invoices : [] });
  } catch (err) {
    console.error("accounting-ar-invoices-list error:", err);
    return Response.json({ error: err.message || "Failed to load AR invoices." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/accounting-ar-invoices-list",
};
