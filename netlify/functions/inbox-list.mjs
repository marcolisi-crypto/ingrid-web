function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export default async () => {
  try {
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
      apiRes = await fetch(`${backendUrl}/api/inbox`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
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
      console.warn("Inbox API returned non-OK status:", apiRes.status);
      return Response.json({
        conversations: [],
        message: "Inbox not implemented yet"
      });
    }

    const conversations = Array.isArray(data.conversations)
      ? data.conversations
      : [];

    const normalizedConversations = conversations
      .map((item) => {
        const rawPhone = item.phone || item.customerPhone || item.from || "";
        const phone = normalizePhone(rawPhone);

        return {
          phone,
          displayName:
            item.displayName ||
            item.customerName ||
            item.name ||
            phone,
          lastMessage:
            String(
              item.lastMessage ||
              item.preview ||
              item.message ||
              item.body ||
              item.transcript ||
              ""
            ).trim(),
          lastTimestamp:
            item.lastTimestamp ||
            item.updatedAt ||
            item.createdAt ||
            item.timestamp ||
            "",
          count: Number(item.count || item.messageCount || 0),
        };
      })
      .filter((item) => item.phone && item.lastMessage)
      .sort((a, b) => {
        const aTs = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
        const bTs = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
        return bTs - aTs;
      });

    return Response.json({ conversations: normalizedConversations });
  } catch (err) {
    console.error("inbox-list error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to load inbox.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/inbox-list",
};
