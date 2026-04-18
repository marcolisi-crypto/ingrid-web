function detectLanguageFromTranscript(transcript) {
  const text = String(transcript || "").toLowerCase();

  if (!text.trim()) return "";

  const englishSignals = [
    "caller: english",
    "continue in english",
    "of course, we can continue in english",
    "yes, i'm listening",
    "i would like",
    "sales department",
    "service department",
    "parts department",
    "perfect, i'll connect you"
  ];

  const frenchSignals = [
    "bonjour",
    "merci d'avoir appelé",
    "je vous écoute",
    "oui, bien sûr",
    "voulez-vous",
    "je vous transfère",
    "parfait, je vous transfère",
    "service réception"
  ];

  if (englishSignals.some((s) => text.includes(s))) return "en-US";
  if (frenchSignals.some((s) => text.includes(s))) return "fr-CA";

  return "";
}

function detectDepartmentFromTranscript(transcript) {
  const text = String(transcript || "").toLowerCase();

  if (!text.trim()) return "";

  if (
    text.includes("sales department") ||
    text.includes("bmw sales") ||
    text.includes("mini sales") ||
    text.includes("ventes")
  ) {
    return "sales";
  }

  if (
    text.includes("service reception") ||
    text.includes("service réception") ||
    text.includes("service department") ||
    text.includes("bmw service") ||
    text.includes("mini service")
  ) {
    return "service";
  }

  if (
    text.includes("parts department") ||
    text.includes("pièces") ||
    text.includes("pieces") ||
    text.includes("parts")
  ) {
    return "parts";
  }

  return "";
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
      apiRes = await fetch(`${backendUrl}/api/calls`, {
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
      return Response.json(
        { error: data.error || "Failed to load calls from backend" },
        { status: apiRes.status }
      );
    }

    const calls = Array.isArray(data.calls) ? data.calls : [];

    const normalizedCalls = await Promise.all(
      calls
        .filter((item) => {
          const type = String(item.type || "call").toLowerCase();
          const callSid = String(item.callSid || "");
          return type === "call" && callSid.startsWith("CA");
        })
        .map(async (item) => {
          const callSid = item.callSid || "";
          const backendTranscript = item.transcript || item.message || "";

          const finalTranscript =
            backendTranscript ||
            "";

          const detectedLanguage =
            item.language ||
            detectLanguageFromTranscript(finalTranscript);

          const detectedDepartment =
            item.routedDepartment ||
            detectDepartmentFromTranscript(finalTranscript);

          return {
            callSid,
            from: item.from || "",
            to: item.to || "",
            startedAt: item.startedAt || item.createdAt || item.updatedAt || "",
            updatedAt:
              item.updatedAt ||
              item.startedAt ||
              item.createdAt ||
              "",
            status: item.status || "",
            language: detectedLanguage || "",
            detectedIntent: item.detectedIntent || "",
            routedDepartment: detectedDepartment || "",
            userName: item.userName || "",
            userNumber: item.userNumber || "",
            transcript: finalTranscript,
            recordingUrl: item.recordingUrl || "",
            notes: item.notes ?? "",
            duration: item.duration || "",
            type: item.type || "call",
            direction: item.direction || "",
          };
        })
    );

    normalizedCalls.sort((a, b) => {
      const ta = new Date(a.startedAt || a.updatedAt || 0).getTime();
      const tb = new Date(b.startedAt || b.updatedAt || 0).getTime();
      return tb - ta;
    });

    return Response.json({ calls: normalizedCalls });
  } catch (err) {
    console.error("api-calls error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to load calls.";

    return Response.json({ error: message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/api-calls",
};
