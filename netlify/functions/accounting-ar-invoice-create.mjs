import { proxyJsonRequest } from "./lib/backend.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const { apiRes, data } = await proxyJsonRequest(req, {
      method: "POST",
      backendPath: "/api/accounting/ar/invoices",
      body
    });

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to create AR invoice" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("accounting-ar-invoice-create error:", err);
    return Response.json({ error: err.message || "Failed to create AR invoice." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/accounting-ar-invoice-create",
};
