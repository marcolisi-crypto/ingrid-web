import { proxyJsonRequest } from "./lib/backend.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.repairOrderId) {
      return Response.json({ error: "Missing repairOrderId" }, { status: 400 });
    }

    const { apiRes, data } = await proxyJsonRequest(req, {
      method: "POST",
      backendPath: `/api/service/repair-orders/${encodeURIComponent(body.repairOrderId)}/pay-splits`,
      body
    });

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to add pay split" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("service-repair-order-pay-split error:", err);
    return Response.json({ error: err.message || "Failed to add pay split." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/service-repair-order-pay-split",
};
