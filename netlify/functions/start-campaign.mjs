import twilio from "twilio";
import { getCampaignStore } from "./lib/store.mjs";

function applyTemplate(template, row) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => row?.[key] ?? "");
}

function normalizeLanguage(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "fr-CA";
  if (raw === "fr" || raw === "fr-ca" || raw === "fr_ca") return "fr-CA";
  if (raw === "en" || raw === "en-us" || raw === "en_us") return "en-US";

  return "fr-CA";
}

function getSiteBaseUrl() {
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    process.env.SITE_URL ||
    ""
  ).replace(/\/$/, "");
}

export default async () => {
  try {
    const store = getCampaignStore();

    const campaign = await store.get("latest-campaign", { type: "json" });
    const settings = await store.get("campaign-settings", { type: "json" });

    if (!campaign?.rows?.length) {
      return Response.json({ error: "No uploaded campaign rows found." }, { status: 400 });
    }

    const campaignType = settings?.campaignType || "dialer";
    const template = settings?.scriptTemplate || "";

    if (!template.trim()) {
      return Response.json({ error: "No campaign script template saved." }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER;
    const outboundVoiceUrl =
      process.env.OUTBOUND_VOICE_URL ||
      "https://ai-reception-csharp-production.up.railway.app/campaign/outbound";
    const siteBaseUrl = getSiteBaseUrl();

    if (!accountSid) {
      return Response.json({ error: "Missing TWILIO_ACCOUNT_SID" }, { status: 500 });
    }

    if (!authToken) {
      return Response.json({ error: "Missing TWILIO_AUTH_TOKEN" }, { status: 500 });
    }

    if (!fromNumber) {
      return Response.json({ error: "Missing TWILIO_SMS_FROM or TWILIO_PHONE_NUMBER" }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);
    const results = [];

    for (const row of campaign.rows) {
      const to = String(row.phone || "").trim();
      if (!to) continue;

      const renderedScript = applyTemplate(template, row);
      const normalizedLanguage = normalizeLanguage(row.language);

      try {
        if (campaignType === "sms") {
          const msg = await client.messages.create({
            to,
            from: fromNumber,
            body: renderedScript,
          });

          results.push({
            phone: to,
            status: "sent",
            sid: msg.sid,
            type: "sms",
            preview: renderedScript,
          });
        } else if (campaignType === "dialer") {
          const url = new URL(outboundVoiceUrl);

          url.searchParams.set("script", renderedScript);
          url.searchParams.set("first_name", row.first_name || "");
          url.searchParams.set("language", normalizedLanguage);
          url.searchParams.set("make", row.make || "");
          url.searchParams.set("model", row.model || "");
          url.searchParams.set("year", row.year || "");
          url.searchParams.set("phone", row.phone || "");

          const callOptions = {
            to,
            from: fromNumber,
            url: url.toString(),
            method: "POST",
            record: true,
          };

          if (siteBaseUrl) {
            callOptions.statusCallback = `${siteBaseUrl}/.netlify/functions/twilio-call-status`;
            callOptions.statusCallbackMethod = "POST";
            callOptions.statusCallbackEvent = ["initiated", "ringing", "answered", "completed"];

            callOptions.recordingStatusCallback = `${siteBaseUrl}/.netlify/functions/twilio-recording-status`;
            callOptions.recordingStatusCallbackMethod = "POST";
            callOptions.recordingStatusCallbackEvent = ["completed"];
          }

          console.log("Campaign dialer payload", {
            to,
            fromNumber,
            outboundVoiceUrl,
            finalUrl: url.toString(),
            language: normalizedLanguage,
            hasStatusCallback: Boolean(callOptions.statusCallback),
            hasRecordingCallback: Boolean(callOptions.recordingStatusCallback),
          });

          const call = await client.calls.create(callOptions);

          results.push({
            phone: to,
            status: "queued",
            sid: call.sid,
            type: "dialer",
            preview: renderedScript,
            language: normalizedLanguage,
          });
        } else {
          throw new Error(`Unsupported campaign type: ${campaignType}`);
        }
      } catch (err) {
        results.push({
          phone: to,
          status: "failed",
          type: campaignType,
          error: err?.message || "Unknown error",
          code: err?.code || "",
          moreInfo: err?.moreInfo || "",
          preview: renderedScript,
          language: normalizedLanguage,
        });
      }
    }

    const summary = {
      runAt: new Date().toISOString(),
      campaignType,
      total: results.length,
      sent: results.filter((r) => r.status === "sent" || r.status === "queued").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };

    await store.setJSON("last-campaign-run", summary);

    return Response.json({ success: true, summary });
  } catch (err) {
    return Response.json(
      {
        error: err?.message || "Unhandled function error",
        stack: String(err?.stack || ""),
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/start-campaign",
};
