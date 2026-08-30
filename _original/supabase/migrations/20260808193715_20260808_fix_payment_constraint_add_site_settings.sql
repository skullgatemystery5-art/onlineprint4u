/*
# Fix payment_method constraint, order_status_log RLS, and add site_settings table

1. Modified Tables
- `orders` — Expand payment_method CHECK constraint to include 'advance' and 'full_upi' (code already uses these values).
- `order_status_log` — Add INSERT policy for authenticated order owners so checkout can log status changes.

2. New Tables
- `site_settings` — Single-row key/value store for dynamic admin-configurable settings (UPI ID, QR code URL, WhatsApp phone, Zoho/Firebase mail config placeholders).

3. Security
- `site_settings` — public read (anon + authenticated) so the frontend can load payment config; admin-only insert/update.
- `order_status_log` — new INSERT policy allowing the order owner to insert (for checkout status logging).
*/

-- 1. Fix orders.payment_method constraint to include 'advance' and 'full_upi'
DO $$
BEGIN
  -- Drop old constraint if it exists, then add the new one
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders' AND constraint_name = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_payment_method_check;
  END IF;
END $$;

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('razorpay','cod','advance','full_upi'));

-- 2. Fix order_status_log: allow order owner to insert (for checkout)
DROP POLICY IF EXISTS "status_log_insert_owner" ON public.order_status_log;
CREATE POLICY "status_log_insert_owner" ON public.order_status_log FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- 3. Create site_settings table for dynamic admin config
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read so the frontend can load UPI/QR/WhatsApp config
DROP POLICY IF EXISTS "site_settings_select_public" ON public.site_settings;
CREATE POLICY "site_settings_select_public" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (true);

-- Admin-only insert
DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- Admin-only update
DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Seed default site settings
INSERT INTO public.site_settings (key, value, description) VALUES
  ('upi_id', 'yourname@okhdfcbank', 'UPI ID for receiving payments'),
  ('qr_code_image', '/qr-code.png', 'Path or URL to the QR code image'),
  ('payee_name', 'Online Print 4U', 'Payee name shown in UPI payment'),
  ('whatsapp_phone', '917858093865', 'WhatsApp phone number for order notifications (with country code, no +)'),
  ('zoho_smtp_host', '', 'Zoho Mail SMTP host (e.g. smtp.zoho.in) — configure when ready'),
  ('zoho_smtp_port', '587', 'Zoho Mail SMTP port'),
  ('zoho_email', '', 'Zoho Mail sender email address — configure when ready'),
  ('firebase_phone_auth_enabled', 'false', 'Set to true when Firebase Phone Auth is activated')
ON CONFLICT (key) DO NOTHING;