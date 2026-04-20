import { proxyJsonRequest } from "./lib/backend.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const { apiRes, data } = await proxyJsonRequest(req, {
      method: "POST",
      backendPath: "/api/service/receptions",
      body
    });

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to create service reception" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("service-receptions-create error:", err);
    return Response.json({ error: err.message || "Failed to create service reception." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/service-receptions-create",
};
