import { getCampaignStore } from "./lib/store.mjs";

export default async () => {
  const store = getCampaignStore();
  const data = await store.get("last-campaign-run", { type: "json" });

  return Response.json(data || {
    runAt: null,
    total: 0,
    sent: 0,
    failed: 0
  });
};

export const config = {
  path: "/.netlify/functions/last-campaign-run",
};