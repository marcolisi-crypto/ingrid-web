import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const callSid = body.callSid;
    const transcript = body.transcript ?? "";

    if (!callSid) {
      return Response.json({ error: "Missing callSid" }, { status: 400 });
    }

    const store = getStore("call-transcripts");

    await store.set(
      callSid,
      JSON.stringify({
        transcript,
        updatedAt: new Date().toISOString(),
      })
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("save-call-transcript error:", err);
    return Response.json(
      { error: err.message || "Failed to save transcript." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/save-call-transcript",
};
