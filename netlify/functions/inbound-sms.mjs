import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    const messageSid = params.get("MessageSid") || `sms-${Date.now()}`;
    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const body = params.get("Body") || "";
    const numMedia = params.get("NumMedia") || "0";

    const store = getStore("calls");

    await store.setJSON(`sms-${messageSid}`, {
      type: "sms-reply",
      callSid: `SMS-${messageSid}`,
      messageSid,
      from,
      to,
      message: body,
      transcript: body,
      status: "sms-reply",
      routedDepartment: "sms",
      detectedIntent: "sms-reply",
      language: "",
      duration: "",
      recordingUrl: "",
      notes: "",
      numMedia,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return new Response("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("inbound-sms error:", err);
    return new Response("Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

export const config = {
  path: "/.netlify/functions/inbound-sms",
};