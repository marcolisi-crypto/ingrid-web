export default async () => {
  try {
    const backendUrl = process.env.CSHARP_BACKEND_URL;
    if (!backendUrl) {
      return Response.json({ error: "Missing CSHARP_BACKEND_URL environment variable" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let apiRes;
    try {
      apiRes = await fetch(`${backendUrl}/api/voice/token`, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await apiRes.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json({ error: "Invalid JSON returned by backend" }, { status: 502 });
    }

    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to fetch voice token" }, { status: apiRes.status });
    }

    return Response.json(data);
  } catch (err) {
    const message = err.name === "AbortError" ? "Backend request timed out" : err.message || "Voice token request failed.";
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/voice-token",
};
