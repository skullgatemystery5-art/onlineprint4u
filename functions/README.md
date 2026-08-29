# Cloud Functions — Online Print 4U

This directory contains Firebase Cloud Functions for the app.

## What it does

**`onOrderCreated`** — A Firestore trigger that fires automatically whenever a new order document is created in the `orders` collection. It sends two notifications to the store owner:

1. **Email** via Resend API
2. **WhatsApp** via WhatsApp Cloud API

## Setup

```bash
cd functions
npm install
```

## Required environment variables (secrets)

Set these before deploying:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set OWNER_EMAIL
firebase functions:secrets:set OWNER_WHATSAPP
```

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | API key from resend.com for sending emails |
| `WHATSAPP_TOKEN` | Access token from Meta WhatsApp Business API |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from Meta WhatsApp Business |
| `OWNER_EMAIL` | Email address to receive order notifications (default: contact@onlineprint4u.in) |
| `OWNER_WHATSAPP` | WhatsApp number with country code, no + (default: 917858093865) |

If any secret is not set, that notification channel is silently skipped — the function will not error.

## Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## How it works with the frontend

The frontend also has a client-side fallback (`src/lib/notify.ts`) that opens a `wa.me` link in a new tab so the customer can send the order details to the owner via WhatsApp. The Cloud Function is the server-side automation that sends notifications without any user action.
