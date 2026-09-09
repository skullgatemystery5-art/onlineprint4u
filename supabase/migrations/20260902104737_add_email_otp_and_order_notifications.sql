/*
# Add Email OTP Login and Order Email Notifications

1. New Tables
- `email_otps` — stores OTP codes sent to users for email-based login.
  - `id` (uuid, primary key)
  - `email` (text, the email address the OTP was sent to)
  - `otp_code` (text, the 6-digit code)
  - `expires_at` (timestamptz, when the code expires — 10 minutes)
  - `used` (boolean, default false — marks the OTP as consumed)
  - `created_at` (timestamptz)

2. Security
- RLS enabled on `email_otps`.
- Policies allow anon + authenticated to insert (for sending OTP) and select (for verifying).
- This is a no-auth-against-supabase app (Firebase handles auth), so anon access is needed.

3. Notes
- The app uses Firebase Authentication for phone OTP and admin email/password.
- Email OTP login is a NEW feature that sends a 6-digit code to the user's email
  via a Supabase Edge Function, stores it in this table, and verifies it.
- OTPs expire after 10 minutes and are single-use.
*/

CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_otps_insert_all" ON public.email_otps;
CREATE POLICY "email_otps_insert_all" ON public.email_otps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "email_otps_select_all" ON public.email_otps;
CREATE POLICY "email_otps_select_all" ON public.email_otps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "email_otps_update_all" ON public.email_otps;
CREATE POLICY "email_otps_update_all" ON public.email_otps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "email_otps_delete_all" ON public.email_otps;
CREATE POLICY "email_otps_delete_all" ON public.email_otps FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON public.email_otps(expires_at);