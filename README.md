# AIT Netlify Dashboard (Full Stack)

Unified dashboard for Automotive Intelligence Reception.

This project powers a full dealership communication system including:

- 📞 Call tracking (Twilio)
- 🧠 AI transcript + intent analysis
- 📝 Internal notes & training feedback
- 💬 SMS inbox + reply system
- 📣 Campaign builder (dialer + SMS)
- 📅 Appointment scheduler
- ⚙️ Dealership configuration panel

---

# 🚀 Overview

This dashboard acts as the **frontend + serverless backend (Netlify Functions)** that connects:

- Twilio (calls, SMS, recordings)
- AI Reception backend (C# API)
- Netlify Blobs (notes + transcripts persistence)

---

# 🧱 Architecture

Frontend (Dashboard UI)  
⬇  
Netlify Functions (API layer)  
⬇  
C# Backend (call data + AI processing)  
⬇  
Twilio (voice, SMS, recordings)

Additional storage:
- Netlify Blobs → transcripts + notes

---

# 📦 Features

## Call Dashboard
- Live call list (auto-refresh)
- Transcript viewer
- Recording playback
- Internal notes system
- KPI tracking (Service / Sales / Parts / BDC / Booked)
- Smart detection:
  - Language (EN / FR)
  - Department routing
  - Booking detection

---

## AI Enhancements

If backend data is missing, the system automatically:

- Detects **language from transcript**
- Detects **department from transcript**
- Persists transcripts in storage
- Merges backend + stored data seamlessly

---

## Inbox (SMS Conversations)

- Conversation list with unread detection
- Full SMS thread view
- Send replies
- Compose new messages
- Auto-refresh every 5 seconds

---

## Campaign Builder

- Upload CSV
- Preview campaign data
- Dynamic script templating (`{{first_name}}`, etc.)
- Supports:
  - Dialer campaigns
  - SMS campaigns
- Tracks last campaign run

---

## Appointment Scheduler

- Book appointments
- Advisor-based scheduling
- Slot availability engine
- Daily scheduler board view

---

## Configuration Panel

Manage:
- Users
- Advisors
- Business hours
- Services
- Twilio settings
- AI routing rules
- Phone numbers
- Fortellis integration

---

# ⚙️ Netlify Functions

## Call Dashboard
- `api-calls.mjs`
- `api-call.mjs`
- `api-update-call.mjs`

## Twilio Webhooks
- `twilio-call-status.mjs`
- `twilio-recording-status.mjs`
- `twilio-transcription.mjs`

## Inbox
- `inbox-list.mjs`
- `inbox-thread.mjs`
- `send-sms-reply.mjs`

## Campaign Builder
- `upload-campaign.mjs`
- `campaign-preview.mjs`
- `campaign-settings.mjs`
- `save-campaign-settings.mjs`
- `start-campaign.mjs`
- `last-campaign-run.mjs`

## Scheduler
- `appointment-slots.mjs`
- `appointments-list.mjs`
- `book-appointment.mjs`
- `scheduler-board.mjs`

## Config
- `config-get.mjs`
- `config-save.mjs`

## Internal Logging
- `internal-log.mjs`

---

# 🌐 API Endpoints

After deploy:

- Dashboard: `/`
- Calls list: `/.netlify/functions/api-calls`
- Call detail: `/.netlify/functions/api-call?callSid=...`
- Save notes: `/.netlify/functions/api-update-call`
- Inbox: `/.netlify/functions/inbox-list`
- Send SMS: `/.netlify/functions/send-sms-reply`
- Upload campaign: `/.netlify/functions/upload-campaign`

---

# 🔑 Environment Variables

Required:

```
CSHARP_BACKEND_URL=https://your-backend-url
```

Optional:

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

---

# ☁️ Netlify Blobs (Storage)

Used for:

- Call transcripts → `call-transcripts`
- Call notes → `call-notes`

Enables:
- Persistent notes
- Transcript caching
- AI training feedback layer

---

# 📞 Twilio Webhooks

Replace `YOUR-SITE` with your Netlify domain.

### Call Status
```
https://YOUR-SITE.netlify.app/.netlify/functions/twilio-call-status
