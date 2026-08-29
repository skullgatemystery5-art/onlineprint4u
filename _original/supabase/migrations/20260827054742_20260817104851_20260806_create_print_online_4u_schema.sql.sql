/*
# Online Print 4U — Core Schema

Creates the full database schema for the print-on-demand web app.

1. New Tables
- `profiles` — user profile rows mirroring auth.users, with role (user/admin).
- `addresses` — saved delivery addresses per user.
- `orders` — print orders with items (jsonb), totals, payment + shipping info, status.
- `order_status_log` — per-status audit trail for each order.
- `coupons` — discount codes (flat or percent) with usage limits and expiry.
- `pricing_rates` — per-page / per-copy print, binding, lamination, addon prices.
- `shipping_rates` — courier tiers with base + per-kg rates and ETA days.
- `reviews` — public customer testimonials shown on the homepage.
- `contact_messages` — submissions from the homepage contact form.
- `site_settings` — dynamic admin config key-value store.

2. Security (RLS)
- profiles: owner read/update/insert; admins can read all.
- addresses: full owner CRUD.
- orders: owner insert/read/update/delete; admins can read + update all.
- order_status_log: owner or admin read; admin-only insert.
- coupons: public read of active coupons; admin CRUD.
- pricing_rates: public read; admin CRUD.
- shipping_rates: public read; admin CRUD.
- reviews: public read of active reviews; admin CRUD.
- contact_messages: anyone may insert; admin-only read/delete.
- site_settings: public read; admin insert/update.

3. Functions / Triggers
- `is_admin()` SECURITY DEFINER helper checking profiles.role = 'admin'.
- `generate_order_number()` produces PO4U-YYMMDD-#### identifiers.
- `touch_updated_at()` trigger keeps orders.updated_at current.

4. Indexes
- orders(user_id), orders(order_number), orders(order_status),
  addresses(user_id), order_status_log(order_id).

5. Notes
- This is a signed-in (authenticated) app: owner columns default to auth.uid().
- Public-read tables (coupons, pricing, shipping, reviews) use TO anon, authenticated
  so the anon-key homepage can load rates/reviews before login.
*/

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  name text NOT NULL,
  phone text NOT NULL,
  alternate_phone text,
  email text,
  line1 text NOT NULL,
  line2 text,
  house_flat text,
  street_area text,
  landmark text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  delivery_instructions text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL DEFAULT '',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text,
  gst numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'razorpay' CHECK (payment_method IN ('razorpay','cod','advance','full_upi')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  order_status text NOT NULL DEFAULT 'placed' CHECK (order_status IN ('placed','processing','printed','shipped','delivered','cancelled')),
  shipping_name text NOT NULL DEFAULT '',
  shipping_phone text NOT NULL DEFAULT '',
  shipping_address text NOT NULL DEFAULT '',
  shipping_pincode text NOT NULL DEFAULT '',
  courier_type text NOT NULL DEFAULT 'standard',
  tracking_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- order_status_log
CREATE TABLE IF NOT EXISTS public.order_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_log ENABLE ROW LEVEL SECURITY;

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('flat','percent')),
  value numeric(12,2) NOT NULL DEFAULT 0,
  min_order numeric(12,2) NOT NULL DEFAULT 0,
  max_discount numeric(12,2),
  expires_at timestamptz,
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- pricing_rates
CREATE TABLE IF NOT EXISTS public.pricing_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'page',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key)
);
ALTER TABLE public.pricing_rates ENABLE ROW LEVEL SECURITY;

-- shipping_rates
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_type text NOT NULL,
  label text NOT NULL,
  base_rate numeric(12,2) NOT NULL DEFAULT 0,
  per_kg_rate numeric(12,2) NOT NULL DEFAULT 0,
  estimated_days int NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (courier_type)
);
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL,
  avatar_color text NOT NULL DEFAULT 'primary',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Addresses policies
DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
CREATE POLICY "addresses_select_own" ON public.addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
CREATE POLICY "addresses_insert_own" ON public.addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
CREATE POLICY "addresses_update_own" ON public.addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;
CREATE POLICY "addresses_delete_own" ON public.addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Orders policies
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (true);
DROP POLICY IF EXISTS "orders_delete_own" ON public.orders;
CREATE POLICY "orders_delete_own" ON public.orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Order status log policies
DROP POLICY IF EXISTS "status_log_select" ON public.order_status_log;
CREATE POLICY "status_log_select" ON public.order_status_log FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "status_log_insert_admin" ON public.order_status_log;
CREATE POLICY "status_log_insert_admin" ON public.order_status_log FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "status_log_insert_owner" ON public.order_status_log;
CREATE POLICY "status_log_insert_owner" ON public.order_status_log FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- Coupons policies
DROP POLICY IF EXISTS "coupons_select_public" ON public.coupons;
CREATE POLICY "coupons_select_public" ON public.coupons FOR SELECT
  TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS "coupons_insert_admin" ON public.coupons;
CREATE POLICY "coupons_insert_admin" ON public.coupons FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "coupons_update_admin" ON public.coupons;
CREATE POLICY "coupons_update_admin" ON public.coupons FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "coupons_delete_admin" ON public.coupons;
CREATE POLICY "coupons_delete_admin" ON public.coupons FOR DELETE
  TO authenticated USING (public.is_admin());

-- Pricing rates policies
DROP POLICY IF EXISTS "pricing_select_public" ON public.pricing_rates;
CREATE POLICY "pricing_select_public" ON public.pricing_rates FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pricing_insert_admin" ON public.pricing_rates;
CREATE POLICY "pricing_insert_admin" ON public.pricing_rates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "pricing_update_admin" ON public.pricing_rates;
CREATE POLICY "pricing_update_admin" ON public.pricing_rates FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "pricing_delete_admin" ON public.pricing_rates;
CREATE POLICY "pricing_delete_admin" ON public.pricing_rates FOR DELETE
  TO authenticated USING (public.is_admin());

-- Shipping rates policies
DROP POLICY IF EXISTS "shipping_select_public" ON public.shipping_rates;
CREATE POLICY "shipping_select_public" ON public.shipping_rates FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shipping_insert_admin" ON public.shipping_rates;
CREATE POLICY "shipping_insert_admin" ON public.shipping_rates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "shipping_update_admin" ON public.shipping_rates;
CREATE POLICY "shipping_update_admin" ON public.shipping_rates FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "shipping_delete_admin" ON public.shipping_rates;
CREATE POLICY "shipping_delete_admin" ON public.shipping_rates FOR DELETE
  TO authenticated USING (public.is_admin());

-- Reviews policies
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT
  TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS "reviews_insert_admin" ON public.reviews;
CREATE POLICY "reviews_insert_admin" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "reviews_update_admin" ON public.reviews;
CREATE POLICY "reviews_update_admin" ON public.reviews FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "reviews_delete_admin" ON public.reviews;
CREATE POLICY "reviews_delete_admin" ON public.reviews FOR DELETE
  TO authenticated USING (public.is_admin());

-- Contact messages policies
DROP POLICY IF EXISTS "contact_insert_any" ON public.contact_messages;
CREATE POLICY "contact_insert_any" ON public.contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "contact_select_admin" ON public.contact_messages;
CREATE POLICY "contact_select_admin" ON public.contact_messages FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "contact_delete_admin" ON public.contact_messages;
CREATE POLICY "contact_delete_admin" ON public.contact_messages FOR DELETE
  TO authenticated USING (public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_status_log_order_id ON public.order_status_log(order_id);

-- Order number sequence + generator
CREATE SEQUENCE IF NOT EXISTS public.order_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'PO4U-' || to_char(now(), 'YYMMDD') || '-' || lpad((nextval('public.order_seq') % 10000)::text, 4, '0');
$$;

-- Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_touch ON public.orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- site_settings table for dynamic admin config
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

-- Add payment screenshot URL and delivery type label to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type_label text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;

-- Seed default site settings
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