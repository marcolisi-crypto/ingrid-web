import { fortellisFetch } from "./lib/fortellis.mjs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || "";
    const advisorId = url.searchParams.get("advisorId") || "";
    const path = process.env.FORTELLIS_APPOINTMENT_SLOTS_PATH;
    const dealerId = process.env.FORTELLIS_DEALER_ID || "";

    if (!date) {
      return Response.json({ error: "Missing date" }, { status: 400 });
    }

    if (!path) {
      return Response.json(
        { error: "Missing FORTELLIS_APPOINTMENT_SLOTS_PATH" },
        { status: 500 }
      );
    }

    // Generic POST body; adjust field names once you confirm the exact API contract.
    const body = {
      dealerId,
      date,
      advisorId: advisorId || undefined,
    };

    const data = await fortellisFetch(path, {
      method: "POST",
      body,
    });

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json(
      { error: err.message || "Appointment slot lookup failed." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/cdk-appointment-slots",
};