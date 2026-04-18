export default async () => {
  try {
    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const apiRes = await fetch(`${backendUrl}/api/tasks`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      }
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
        { error: data.error || "Failed to load tasks from backend" },
        { status: apiRes.status }
      );
    }

    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    return Response.json({ tasks });
  } catch (err) {
    console.error("tasks-list error:", err);
    return Response.json(
      { error: err.message || "Failed to load tasks." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/tasks-list",
};
