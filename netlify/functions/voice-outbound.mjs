export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const backendUrl = process.env.CSHARP_BACKEND_URL;
    if (!backendUrl) {
      return Response.json({ error: "Missing CSHARP_BACKEND_URL environment variable" }, { status: 500 });
    }

    const payload = await req.json().catch(() => ({}));
    const to = String(payload.to || "").trim();
    if (!to) {
      return Response.json({ error: "Missing destination number" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let apiRes;
    try {
      apiRes = await fetch(`${backendUrl}/api/voice/outbound`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
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
      return Response.json({ error: data.error || "Failed to create outbound call" }, { status: apiRes.status });
    }

    return Response.json({
      success: true,
      callSid: data.callSid || data.sid || "",
      status: data.status || "queued",
      details: data,
    });
  } catch (err) {
    const message = err.name === "AbortError" ? "Backend request timed out" : err.message || "Voice outbound request failed.";
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/voice-outbound",
};
