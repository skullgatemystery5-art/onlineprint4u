# Cloud Functions — Online Print 4U

This directory contains Firebase Cloud Functions for the app.

## What it does

**`onOrderCreated`** — A Firestore trigger that fires automatically whenever a new order document is created in the `orders` collection. It sends two notifications to the store owner:

1. **Email** via SMTP (Zoho)
2. **WhatsApp** via WhatsApp Cloud API

## Setup

```bash
cd functions
npm install
```

## Required environment variables (secrets)

Set these before deploying:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set SMTP_FROM
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set OWNER_EMAIL
firebase functions:secrets:set OWNER_WHATSAPP
```

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname (default: smtp.zoho.in) |
| `SMTP_PORT` | SMTP port — use 465 for SSL or 587 for STARTTLS (default: 465) |
| `SMTP_USER` | Your Zoho email address (e.g. noreply@onlineprint4u.in) |
| `SMTP_PASS` | Your Zoho email password or app-specific password |
| `SMTP_FROM` | From name and address (default: Online Print 4U <SMTP_USER>) |
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
