import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();

    const callSid = body.callSid;
    const messageSid = body.messageSid || "";
    const from = body.from || "";
    const to = body.to || "";
    const language = body.language || "";
    const detectedIntent = body.detectedIntent || "";
    const routedDepartment = body.routedDepartment || "";
    const userName = body.userName || "";
    const userNumber = body.userNumber || "";
    const message = body.message || "";
    const response = body.response || "";
    const status = body.status || "";
    const timestamp = new Date().toISOString();

    if (!callSid) {
      return Response.json({ error: "Missing callSid" }, { status: 400 });
    }

    const store = getStore("calls");
    const existing = await store.get(callSid, { type: "json" });

    const resolvedType =
      body.type ||
      existing?.type ||
      (messageSid ? "sms" : "call");

    const updated = {
      ...(existing || {}),
      type: resolvedType,
      callSid,
      messageSid: messageSid || existing?.messageSid || "",
      from: existing?.from || from,
      to: existing?.to || to,
      userName: userName || existing?.userName || "",
      userNumber: userNumber || existing?.userNumber || "",
      status: status || existing?.status || "",
      routedDepartment: routedDepartment || existing?.routedDepartment || "",
      detectedIntent: detectedIntent || existing?.detectedIntent || "",
      language: language || existing?.language || "",
      duration: body.duration || existing?.duration || "",
      transcript: body.transcript || existing?.transcript || "",
      recordingUrl: body.recordingUrl || existing?.recordingUrl || "",
      notes: body.notes || existing?.notes || "",
      message: message || existing?.message || "",
      response: response || existing?.response || "",
      startedAt: existing?.startedAt || body.startedAt || timestamp,
      updatedAt: timestamp,
      createdAt: existing?.createdAt || body.createdAt || timestamp,
    };

    await store.setJSON(callSid, updated);

    return Response.json({
      success: true,
      call: updated,
    });
  } catch (err) {
    console.error("internal-log error:", err);
    return Response.json(
      { error: err.message || "Failed to write internal log." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/internal-log",
};
