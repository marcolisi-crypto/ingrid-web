function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const phone = normalizePhone(url.searchParams.get("phone") || "");

    if (!phone) {
      return Response.json(
        { error: "Missing phone" },
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
        `${backendUrl}/api/inbox/${encodeURIComponent(phone)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
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
        { error: data.error || "Failed to load thread from backend" },
        { status: apiRes.status }
      );
    }

    const messages = Array.isArray(data.messages) ? data.messages : [];

    const normalizedMessages = messages
      .map((item, index) => {
        const body = String(
          item.body ||
          item.message ||
          item.transcript ||
          item.text ||
          ""
        ).trim();

        return {
          id:
            item.id ||
            item.messageSid ||
            item.callSid ||
            `msg-${index}`,
          type: String(
            item.type ||
            item.direction ||
            "sms"
          ).toLowerCase(),
          from: item.from || item.sender || "",
          to: item.to || item.recipient || "",
          body,
          displayBody: body,
          timestamp:
            item.timestamp ||
            item.updatedAt ||
            item.createdAt ||
            item.startedAt ||
            "",
          status: item.status || "",
          recordingUrl: item.recordingUrl || "",
        };
      })
      .filter((item) => {
        const from = normalizePhone(item.from);
        const to = normalizePhone(item.to);
        return (from === phone || to === phone) && item.body;
      })
      .sort((a, b) => {
        const aTs = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTs = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return aTs - bTs;
      });

    return Response.json({
      phone,
      messages: normalizedMessages,
    });
  } catch (err) {
    console.error("inbox-thread error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to load thread.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/inbox-thread",
};
