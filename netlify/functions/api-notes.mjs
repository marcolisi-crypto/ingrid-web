export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    const body = await req.json();
    const callSid = body.callSid;
    const notes = body.notes ?? body.body ?? "";

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

    const apiRes = await fetch(`${backendUrl}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        callSid,
        body: notes,
        noteType: "call"
      })
    });

    const rawText = await apiRes.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {};
    }

    if (!apiRes.ok) {
      return Response.json(
        { error: data.error || "Failed to save note to backend" },
        { status: apiRes.status }
      );
    }

    return Response.json({
      success: true,
      note: data,
    });
  } catch (err) {
    console.error("api-notes error:", err);
    return Response.json(
      { error: err.message || "Failed to save notes." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/api-notes",
};
