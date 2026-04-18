export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const to = String(body.to || "").trim();
    const message = String(body.message || "").trim();

    if (!to || !message) {
      return Response.json(
        { error: "Missing to or message" },
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
      apiRes = await fetch(`${backendUrl}/api/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ to, message }),
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
      return Response.json(
        { error: "Invalid JSON returned by backend" },
        { status: 502 }
      );
    }

    if (!apiRes.ok) {
      return Response.json(
        { error: data.error || "Failed to send SMS from backend" },
        { status: apiRes.status }
      );
    }

    const sid = data.sid || data.messageSid || data.smsSid || "";
    const now = new Date().toISOString();

    const record = {
      id: data.id || (sid ? `sms-out-${sid}` : ""),
      type: data.type || "sms-reply",
      callSid: data.callSid || (sid ? `SMS-${sid}` : ""),
      messageSid: sid,
      from: data.from || "",
      to: data.to || to,
      message: data.message || message,
      body: data.body || data.message || message,
      transcript: data.transcript || data.body || data.message || message,
      status: data.status || "sent",
      routedDepartment: data.routedDepartment || "sms",
      detectedIntent: data.detectedIntent || "sms-outbound",
      language: data.language || "",
      duration: data.duration || "",
      recordingUrl: data.recordingUrl || "",
      notes: data.notes || "",
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };

    return Response.json({
      success: true,
      sid,
      key: data.key || record.id,
      record,
    });
  } catch (err) {
    console.error("send-sms-reply error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to send reply.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/send-sms-reply",
};
