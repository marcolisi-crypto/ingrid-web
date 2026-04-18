export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const section = body.section;
    const value = body.value;

    if (!section) {
      return Response.json(
        { error: "Missing section" },
        { status: 400 }
      );
    }

    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let apiRes;
    try {
      apiRes = await fetch(
        `${backendUrl}/api/config/${encodeURIComponent(section)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(value),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

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
        { error: data.error || "Failed to save config to backend" },
        { status: apiRes.status }
      );
    }

    return Response.json({
      success: data.success ?? true
    });

  } catch (err) {
    console.error("config-save error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to save config.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/config-save",
};
