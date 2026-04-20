import { proxyJsonRequest } from "./lib/backend.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const { apiRes, data } = await proxyJsonRequest(req, {
      method: "POST",
      backendPath: "/api/accounting/ap/bills",
      body
    });

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to create AP bill" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("accounting-ap-bill-create error:", err);
    return Response.json({ error: err.message || "Failed to create AP bill." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/accounting-ap-bill-create",
};
