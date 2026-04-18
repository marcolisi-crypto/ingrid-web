import { fortellisFetch } from "./lib/fortellis.mjs";

export default async () => {
  try {
    // Lightweight connectivity test using a configured path if available.
    const testPath =
      process.env.FORTELLIS_SERVICE_ADVISORS_PATH ||
      process.env.FORTELLIS_APPOINTMENT_SLOTS_PATH ||
      process.env.FORTELLIS_CUSTOMER_BY_PHONE_PATH;

    if (!testPath) {
      return Response.json(
        { error: "Set at least one Fortellis path env var to test connectivity." },
        { status: 400 }
      );
    }

    const data = await fortellisFetch(testPath, { method: "GET" });

    return Response.json({
      success: true,
      message: "Fortellis connection successful.",
      sampleKeys: Object.keys(data || {}).slice(0, 10),
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Fortellis test failed." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/fortellis-test",
};