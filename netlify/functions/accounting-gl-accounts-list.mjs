import { getBackendUrl, parseBackendJson } from "./lib/backend.mjs";

export default async () => {
  try {
    const backendUrl = getBackendUrl();
    const apiRes = await fetch(`${backendUrl}/api/accounting/gl/accounts`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await parseBackendJson(apiRes);
    if (!apiRes.ok) {
      return Response.json({ error: data.error || "Failed to load GL accounts" }, { status: apiRes.status });
    }

    return Response.json({ accounts: Array.isArray(data.accounts) ? data.accounts : [] });
  } catch (err) {
    console.error("accounting-gl-accounts-list error:", err);
    return Response.json({ error: err.message || "Failed to load GL accounts." }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/accounting-gl-accounts-list",
};
