export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const callSid = body.callSid;
    const notes = body.notes ?? "";

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let apiRes;
    try {
      apiRes = await fetch(
        `${backendUrl}/api/calls/${encodeURIComponent(callSid)}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ notes }),
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
      data = {};
    }

    const updatedCall = data.call || data.updatedCall || {
      callSid,
      notes,
      updatedAt: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      call: {
        callSid: updatedCall.callSid || callSid,
        from: updatedCall.from || "",
        to: updatedCall.to || "",
        userName: updatedCall.userName || "",
        userNumber: updatedCall.userNumber || "",
        status: updatedCall.status || "",
        routedDepartment: updatedCall.routedDepartment || "",
        detectedIntent: updatedCall.detectedIntent || "",
        language: updatedCall.language || "",
        duration: updatedCall.duration || "",
        transcript: updatedCall.transcript || updatedCall.message || "",
        recordingUrl: updatedCall.recordingUrl || "",
        notes,
        startedAt: updatedCall.startedAt || updatedCall.createdAt || updatedCall.updatedAt || "",
        updatedAt: updatedCall.updatedAt || new Date().toISOString(),
        type: updatedCall.type || "call",
        direction: updatedCall.direction || "",
      },
    });
  } catch (err) {
    console.error("api-update-call error:", err);

    const message =
      err.name === "AbortError"
        ? "Backend request timed out"
        : err.message || "Failed to update call.";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/api-update-call",
};
