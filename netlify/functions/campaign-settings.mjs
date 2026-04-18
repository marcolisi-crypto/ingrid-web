import { getCampaignStore } from "./lib/store.mjs";

export default async () => {
  const store = getCampaignStore();
  const settings = await store.get("campaign-settings", { type: "json" });
  return Response.json(settings || { campaignType: "dialer", scriptTemplate: "" });
};

export const config = { path: "/.netlify/functions/campaign-settings" };