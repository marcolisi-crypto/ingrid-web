import { proxyJsonRequest } from "./lib/backend.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const { apiRes, data } = await proxyJsonRequest(req, {
      method: "POST",
      backendPath: "/api/appointments",
      body
    });

    if (!apiRes.ok) {
      return Response.json(
        { error: data.error || "Failed to create appointment" },
        { status: apiRes.status }
      );
    }

    return Response.json({
      success: true,
      appointment: data,
      confirmationNumber: data.id || ""
    });
  } catch (err) {
    console.error("appointments-create error:", err);
    return Response.json(
      { error: err.message || "Failed to create appointment." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/appointments-create",
};
