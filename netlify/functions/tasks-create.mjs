export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const apiRes = await fetch(`${backendUrl}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

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
        { error: data.error || "Failed to create task" },
        { status: apiRes.status }
      );
    }

    return Response.json(data);
  } catch (err) {
    console.error("tasks-create error:", err);
    return Response.json(
      { error: err.message || "Failed to create task." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/tasks-create",
};
