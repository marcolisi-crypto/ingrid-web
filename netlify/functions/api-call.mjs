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

export default async (req) => {
  try {
    const url = new URL(req.url);
    const callSid = url.searchParams.get("callSid");

    if (!callSid) {
      return Response.json(
        { error: "Missing callSid" },
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

    const apiRes = await fetch(
      `${backendUrl}/api/calls/${encodeURIComponent(callSid)}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      }
    );

    const rawText = await apiRes.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return Response.json(
        {
          error: "Invalid JSON returned by backend",
          raw: rawText
        },
        { status: 502 }
      );
    }

    if (!apiRes.ok) {
      return Response.json(
        { error: data.error || "Failed to load call from backend" },
        { status: apiRes.status }
      );
    }

    const finalTranscript =
      data.transcript ||
      data.message ||
      "";

    const detectedLanguage =
      data.language ||
      detectLanguageFromTranscript(finalTranscript);

    const detectedDepartment =
      data.routedDepartment ||
      detectDepartmentFromTranscript(finalTranscript);

    const normalized = {
      callSid: data.callSid || callSid,
      from: data.from || "",
      to: data.to || "",
      userName: data.userName || "",
      userNumber: data.userNumber || "",
      status: data.status || "",
      routedDepartment: detectedDepartment || "",
      detectedIntent: data.detectedIntent || "",
      language: detectedLanguage || "",
      duration: data.duration || "",
      transcript: finalTranscript,
      recordingUrl: data.recordingUrl || "",
      notes: data.notes ?? "",
      startedAt: data.startedAt || data.createdAt || data.updatedAt || "",
      updatedAt:
        data.updatedAt ||
        data.startedAt ||
        data.createdAt ||
        "",
      type: data.type || "call",
      direction: data.direction || "",
    };

    return Response.json(normalized);
  } catch (err) {
    console.error("api-call error:", err);

    return Response.json(
      { error: err.message || "Failed to load call." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/api-call",
};
