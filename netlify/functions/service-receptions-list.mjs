import { proxyJsonRequest } from "./lib/backend.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(req.url);
    const params = url.searchParams.toString();
    const { apiRes, data } = await proxyJsonRequest(req, {
      method: "GET",
      backendPath: `/api/service/receptions${params ? `?${params}` : ""}`
    });

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load service receptions" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    console.error("service-receptions-list error:", err);
    return Response.json({ error: err.message || "Failed to load service receptions." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/service-receptions-list",
};
