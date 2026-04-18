import { fortellisFetch } from "./lib/fortellis.mjs";

export default async () => {
  try {
    const path = process.env.FORTELLIS_SERVICE_ADVISORS_PATH;

    if (!path) {
      return Response.json(
        { error: "Missing FORTELLIS_SERVICE_ADVISORS_PATH" },
        { status: 500 }
      );
    }

    const data = await fortellisFetch(path);

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json(
      { error: err.message || "Advisor lookup failed." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/cdk-service-advisors",
};