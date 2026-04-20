import { getBackendUrl, parseBackendJson } from "./lib/backend.mjs";

export default async () => {
  try {
    const backendUrl = getBackendUrl();
    const apiRes = await fetch(`${backendUrl}/api/accounting/ap/bills`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await parseBackendJson(apiRes);
    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load AP bills" }, { status: apiRes.status });
    }

    return Response.json({ bills: Array.isArray(data.bills) ? data.bills : [] });
  } catch (err) {
    console.error("accounting-ap-bills-list error:", err);
    return Response.json({ error: err.message || "Failed to load AP bills." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/accounting-ap-bills-list",
};
