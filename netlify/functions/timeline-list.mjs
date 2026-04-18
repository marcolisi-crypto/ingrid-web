export default async (req) => {
  try {
    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const params = new URLSearchParams();

    ["customerId", "vehicleId", "limit"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    });

    const apiRes = await fetch(`${backendUrl}/api/dms/timeline?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const rawText = await apiRes.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json(
        { error: "Invalid JSON returned by backend" },
        { status: 502 }
      );
    }

    if (!apiRes.ok) {
      return Response.json(
        { error: data.error || "Failed to load timeline from backend" },
        { status: apiRes.status }
      );
    }

    return Response.json({
      events: Array.isArray(data.events) ? data.events : []
    });
  } catch (err) {
    console.error("timeline-list error:", err);
    return Response.json(
      { error: err.message || "Failed to load timeline." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/timeline-list",
};
