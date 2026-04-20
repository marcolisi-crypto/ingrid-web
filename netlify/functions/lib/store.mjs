import { getStore } from "@netlify/blobs";

const callsStore = getStore("call-dashboard");
const campaignStore = getStore("campaign-data");
const mediaStore = getStore("media-assets", { consistency: "strong" });

export function getCallsStore() {
  return callsStore;
}

export function getCampaignStore() {
  return campaignStore;
}

export function getMediaStore() {
  return mediaStore;
}

export async function getCallsIndex() {
  return (await callsStore.get("calls-index", { type: "json" })) || [];
}

export async function setCallsIndex(index) {
  await callsStore.setJSON("calls-index", index);
}

export async function getCall(callSid) {
  return await callsStore.get(`call:${callSid}`, { type: "json" });
}

export async function saveCall(callSid, patch = {}) {
  const existing = (await getCall(callSid)) || {
    callSid,
    from: "",
    to: "",
    startedAt: "",
    endedAt: "",
    status: "",
    language: "",
    detectedIntent: "",
    routedDepartment: "",
    recordingUrl: "",
    transcript: "",
    duration: "",
    notes: "",
    updatedAt: "",
    sourceEvents: []
  };

  const merged = {
    ...existing,
    ...patch,
    sourceEvents: patch.sourceEvents ? [...(existing.sourceEvents || []), ...patch.sourceEvents] : (existing.sourceEvents || []),
    updatedAt: new Date().toISOString()
  };

  await callsStore.setJSON(`call:${callSid}`, merged);

  let index = await getCallsIndex();
  index = index.filter(item => item !== callSid);
  index.unshift(callSid);
  await setCallsIndex(index.slice(0, 1000));

  return merged;
}
