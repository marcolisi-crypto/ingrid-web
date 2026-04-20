import { getBackendUrl, parseBackendJson } from "./lib/backend.mjs";

export default async (req) => {
  try {
    const backendUrl = getBackendUrl();
    const url = new URL(req.url);
    const params = new URLSearchParams();
    ["customerId", "vehicleId", "repairOrderId", "contextType"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    });

    const apiRes = await fetch(`${backendUrl}/api/media?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await parseBackendJson(apiRes);
    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load media assets" }, { status: apiRes.status });
    }

    return Response.json({ media: Array.isArray(data.media) ? data.media : [] });
  } catch (err) {
    console.error("media-assets-list error:", err);
    return Response.json({ error: err.message || "Failed to load media assets." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/media-assets-list",
};
