export default async () => {
  try {
    const backendUrl = process.env.CSHARP_BACKEND_URL;

    if (!backendUrl) {
      return Response.json(
        { error: "Missing CSHARP_BACKEND_URL environment variable" },
        { status: 500 }
      );
    }

    const apiRes = await fetch(`${backendUrl}/api/dms/customers`, {
      method: "GET",
      headers: { Accept: "application/json" }
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
        { error: data.error || "Failed to load customers from backend" },
        { status: apiRes.status }
      );
    }

    return Response.json({
      customers: Array.isArray(data.customers) ? data.customers : []
    });
  } catch (err) {
    console.error("customers-list error:", err);
    return Response.json(
      { error: err.message || "Failed to load customers." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/customers-list",
};
