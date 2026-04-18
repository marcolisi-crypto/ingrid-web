import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    const callSid = params.get("CallSid");
    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const callStatus = params.get("CallStatus") || "";
    const direction = params.get("Direction") || "";
    const duration = params.get("CallDuration") || "";
    const timestamp = new Date().toISOString();

    if (!callSid) {
      return new Response("Missing CallSid", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const store = getStore("calls");
    const existing = await store.get(callSid, { type: "json" });

    const updated = {
      ...(existing || {}),
      type: existing?.type || "call",
      callSid,
      from: existing?.from || from,
      to: existing?.to || to,
      userName: existing?.userName || "",
      userNumber: existing?.userNumber || "",
      status: callStatus,
      routedDepartment: existing?.routedDepartment || "",
      detectedIntent: existing?.detectedIntent || "",
      language: existing?.language || "",
      duration: duration || existing?.duration || "",
      transcript: existing?.transcript || "",
      recordingUrl: existing?.recordingUrl || "",
      notes: existing?.notes || "",
      direction: direction || existing?.direction || "",
      startedAt: existing?.startedAt || timestamp,
      updatedAt: timestamp,
    };

    await store.setJSON(callSid, updated);

    return new Response("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("twilio-call-status error:", err);
    return new Response("Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

export const config = {
  path: "/.netlify/functions/twilio-call-status",
};