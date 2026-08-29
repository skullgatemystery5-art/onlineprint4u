/*
# Add site_settings table and missing order columns

1. Creates site_settings table for dynamic admin config
2. Adds payment_screenshot_url, delivery_type_label, customer_email columns to orders
3. Seeds default site settings
4. Adds RLS policies for site_settings (public read, admin write)
*/

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select_public" ON public.site_settings;
CREATE POLICY "site_settings_select_public" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type_label text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;

INSERT INTO public.site_settings (key, value, description) VALUES
  ('upi_id', 'yourname@okhdfcbank', 'UPI ID for receiving payments'),
  ('qr_code_image', '/qr-code.png', 'Path or URL to the QR code image'),
  ('payee_name', 'Online Print 4U', 'Payee name shown in UPI payment'),
  ('whatsapp_phone', '917858093865', 'WhatsApp phone number for order notifications'),
  ('zoho_smtp_host', '', 'Zoho Mail SMTP host'),
  ('zoho_smtp_port', '587', 'Zoho Mail SMTP port'),
  ('zoho_email', '', 'Zoho Mail sender email address'),
  ('firebase_phone_auth_enabled', 'false', 'Set to true when Firebase Phone Auth is activated')
ON CONFLICT (key) DO NOTHING;