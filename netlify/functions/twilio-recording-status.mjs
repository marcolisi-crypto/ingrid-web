import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    const callSid = params.get("CallSid");
    const recordingSid = params.get("RecordingSid") || "";
    const recordingUrl = params.get("RecordingUrl") || "";
    const recordingStatus = params.get("RecordingStatus") || "";
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
      from: existing?.from || "",
      to: existing?.to || "",
      userName: existing?.userName || "",
      userNumber: existing?.userNumber || "",
      status: existing?.status || "",
      routedDepartment: existing?.routedDepartment || "",
      detectedIntent: existing?.detectedIntent || "",
      language: existing?.language || "",
      duration: existing?.duration || "",
      transcript: existing?.transcript || "",
      notes: existing?.notes || "",
      recordingSid,
      recordingStatus,
      recordingUrl: recordingUrl ? `${recordingUrl}.mp3` : (existing?.recordingUrl || ""),
      startedAt: existing?.startedAt || timestamp,
      updatedAt: timestamp,
    };

    await store.setJSON(callSid, updated);

    return new Response("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("twilio-recording-status error:", err);
    return new Response("Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

export const config = {
  path: "/.netlify/functions/twilio-recording-status",
};