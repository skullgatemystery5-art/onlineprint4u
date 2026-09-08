# Cloud Functions — Online Print 4U

This directory contains Firebase Cloud Functions for the app.

## What it does

**`onOrderCreated`** — A Firestore trigger that fires automatically whenever a new order document is created in the `orders` collection. It sends two notifications to the store owner:

1. **Email** via Zoho SMTP
2. **WhatsApp** via WhatsApp Cloud API

**`sendOtp`** — Callable function that generates a 6-digit OTP, stores it in Firestore, and delivers it via:
- **Email**: Zoho SMTP (nodemailer) — no Firebase default email provider is used
- **Phone**: WhatsApp Cloud API

**`verifyOtp`** — Callable function that validates the OTP, creates/retrieves a Firebase user, and returns a custom token for client sign-in.

**`sendPasswordReset`** — Callable function that sends a password reset email through Zoho SMTP. This replaces Firebase's built-in `sendPasswordResetEmail` so that all emails go exclusively through Zoho.

## Setup

```bash
cd functions
npm install
```

## Required environment variables (secrets)

The Zoho SMTP credentials are declared as Firebase environment secrets via `functions.params.defineSecret()` and bound to each function with `runWith({ secrets: [...] })`. At deploy time, Firebase automatically provisions them from Cloud Secret Manager and injects them into the function's runtime environment.

Set these before deploying. The Zoho variables use `VITE_ZOHO_*` naming to match Vercel environment variable conventions:

```bash
firebase functions:secrets:set VITE_ZOHO_SMTP_HOST
firebase functions:secrets:set VITE_ZOHO_SMTP_PORT
firebase functions:secrets:set VITE_ZOHO_USER
firebase functions:secrets:set VITE_ZOHO_PASS
firebase functions:secrets:set VITE_ZOHO_FROM
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set OWNER_EMAIL
firebase functions:secrets:set OWNER_WHATSAPP
```

| Variable | Description | Declared as secret |
|---|---|---|
| `VITE_ZOHO_SMTP_HOST` | SMTP server hostname (default: smtp.zoho.in) | Yes — `defineSecret` |
| `VITE_ZOHO_SMTP_PORT` | SMTP port — use 465 for SSL or 587 for STARTTLS (default: 465) | Yes — `defineSecret` |
| `VITE_ZOHO_USER` | Your Zoho email address (e.g. noreply@onlineprint4u.in) | Yes — `defineSecret` |
| `VITE_ZOHO_PASS` | Your Zoho email password or app-specific password | Yes — `defineSecret` |
| `VITE_ZOHO_FROM` | From name and address (default: Online Print 4U <VITE_ZOHO_USER>) | Yes — `defineSecret` |
| `WHATSAPP_TOKEN` | Access token from Meta WhatsApp Business API | No — read via `process.env` |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from Meta WhatsApp Business | No — read via `process.env` |
| `OWNER_EMAIL` | Email address to receive order notifications (default: contact@onlineprint4u.in) | No — read via `process.env` |
| `OWNER_WHATSAPP` | WhatsApp number with country code, no + (default: 917858093865) | No — read via `process.env` |

The five `VITE_ZOHO_*` secrets are bound to `sendOtp`, `verifyOtp`, `sendPasswordReset`, and `onOrderCreated` through `runWith({ secrets })`. Nodemailer reads their values at runtime via `secretParam.value()`. If `VITE_ZOHO_USER` or `VITE_ZOHO_PASS` is not set, email sending is silently skipped — the function will not error.

## Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## How it works with the frontend

The frontend also has a client-side fallback (`src/lib/notify.ts`) that opens a `wa.me` link in a new tab so the customer can send the order details to the owner via WhatsApp. The Cloud Function is the server-side automation that sends notifications without any user action.
