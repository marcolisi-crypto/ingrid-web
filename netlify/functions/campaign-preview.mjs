import { getCampaignStore } from "./lib/store.mjs";

export default async () => {
  const store = getCampaignStore();
  const data = await store.get("latest-campaign", { type: "json" });
  return Response.json(data || { uploadedAt: null, headers: [], rows: [] });
};

export const config = { path: "/.netlify/functions/campaign-preview" };