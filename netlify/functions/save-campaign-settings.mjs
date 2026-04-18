import { getCampaignStore } from "./lib/store.mjs";

export default async (req) => {
  const store = getCampaignStore();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await req.json();
  if (!body || !body.scriptTemplate) {
    return Response.json({ error: "Missing scriptTemplate" }, { status: 400 });
  }

  const payload = {
    campaignType: body.campaignType || "dialer",
    scriptTemplate: String(body.scriptTemplate),
    updatedAt: new Date().toISOString()
  };

  await store.setJSON("campaign-settings", payload);
  return Response.json({ success: true, settings: payload });
};

export const config = { path: "/.netlify/functions/save-campaign-settings" };