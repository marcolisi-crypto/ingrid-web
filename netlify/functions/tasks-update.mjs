export default async (req) => {
  try {
    if (req.method !== "PATCH" && req.method !== "POST") {
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
    const taskId = body.taskId;

    if (!taskId) {
      return Response.json(
        { error: "Missing taskId" },
        { status: 400 }
      );
    }

    const apiRes = await fetch(`${backendUrl}/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        status: body.status ?? "",
        assignedDepartment: body.assignedDepartment || "",
        assignedUser: body.assignedUser || ""
      })
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
        { error: data.error || "Failed to update task" },
        { status: apiRes.status }
      );
    }

    return Response.json(data);
  } catch (err) {
    console.error("tasks-update error:", err);
    return Response.json(
      { error: err.message || "Failed to update task." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/tasks-update",
};
