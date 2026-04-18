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

    ["customerId", "vehicleId", "callSid"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    });

    const apiRes = await fetch(`${backendUrl}/api/notes?${params.toString()}`, {
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
        { error: data.error || "Failed to load notes from backend" },
        { status: apiRes.status }
      );
    }

    return Response.json({
      notes: Array.isArray(data.notes) ? data.notes : []
    });
  } catch (err) {
    console.error("notes-list error:", err);
    return Response.json(
      { error: err.message || "Failed to load notes." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/notes-list",
};
