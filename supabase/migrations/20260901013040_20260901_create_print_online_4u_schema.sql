/*
# Online Print 4U — Core Schema (Supabase Migration)

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
- `site_settings` — dynamic admin config (UPI ID, WhatsApp number, etc.)

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
- site_settings: public read; admin CRUD.

3. Functions / Triggers
- `is_admin()` SECURITY DEFINER helper checking profiles.role = 'admin'.
- `generate_order_number()` produces PO4U-YYMMDD-#### identifiers.
- `touch_updated_at()` trigger keeps orders.updated_at current.

4. Indexes
- orders(user_id), orders(order_number), orders(order_status),
  addresses(user_id), order_status_log(order_id).

5. Notes
- This is a signed-in (authenticated) app: owner columns default to auth.uid().
- Public-read tables (coupons, pricing, shipping, reviews, site_settings) use TO anon, authenticated
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

-- site_settings table for dynamic admin config
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

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

-- Site settings policies
DROP POLICY IF EXISTS "site_settings_select_public" ON public.site_settings;
CREATE POLICY "site_settings_select_public" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

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

-- Add extra columns to orders (added in later migrations)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type_label text;

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

-- Seed default pricing rates
INSERT INTO public.pricing_rates (category, key, label, price, unit) VALUES
  ('print_per_page', '70_bw_single', '70 GSM Economy B&W One Side', 0.90, 'page'),
  ('print_per_page', '70_bw_double', '70 GSM Economy B&W Both Sides', 0.40, 'page'),
  ('print_per_page', '70_color_single', '70 GSM Economy Color One Side', 5.00, 'page'),
  ('print_per_page', '70_color_double', '70 GSM Economy Color Both Sides', 4.00, 'page'),
  ('print_per_page', '75_bw_single', '75 GSM Standard B&W One Side', 1.00, 'page'),
  ('print_per_page', '75_bw_double', '75 GSM Standard B&W Both Sides', 0.60, 'page'),
  ('print_per_page', '75_color_single', '75 GSM Standard Color One Side', 6.00, 'page'),
  ('print_per_page', '75_color_double', '75 GSM Standard Color Both Sides', 5.00, 'page'),
  ('print_per_page', '85_bw_single', '85 GSM Plus B&W One Side', 1.70, 'page'),
  ('print_per_page', '85_bw_double', '85 GSM Plus B&W Both Sides', 1.50, 'page'),
  ('print_per_page', '85_color_single', '85 GSM Plus Color One Side', 7.00, 'page'),
  ('print_per_page', '85_color_double', '85 GSM Plus Color Both Sides', 6.00, 'page'),
  ('print_per_page', '100_bw_single', '100 GSM Premium B&W One Side', 3.00, 'page'),
  ('print_per_page', '100_bw_double', '100 GSM Premium B&W Both Sides', 2.50, 'page'),
  ('print_per_page', '100_color_single', '100 GSM Premium Color One Side', 8.00, 'page'),
  ('print_per_page', '100_color_double', '100 GSM Premium Color Both Sides', 7.00, 'page')
ON CONFLICT (category, key) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label;

-- Binding rates
INSERT INTO public.pricing_rates (category, key, label, price, unit) VALUES
  ('binding', 'none', 'No Binding', 0.00, 'copy'),
  ('binding', 'spiral', 'Spiral Binding', 40.00, 'copy'),
  ('binding', 'soft', 'Soft Binding', 100.00, 'copy'),
  ('binding', 'hard', 'Hard Binding', 100.00, 'copy'),
  ('binding', 'thesis', 'Thesis Hard Binding', 350.00, 'copy')
ON CONFLICT (category, key) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label;

-- Add-ons
INSERT INTO public.pricing_rates (category, key, label, price, unit) VALUES
  ('addons', 'premium_photo', 'Premium Photo Prints', 25.00, 'page'),
  ('lamination', 'none', 'No Lamination', 0.00, 'copy'),
  ('lamination', 'transparent', 'Transparent Cover', 15.00, 'copy')
ON CONFLICT (category, key) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label;

-- Shipping rates
INSERT INTO public.shipping_rates (courier_type, label, base_rate, per_kg_rate, estimated_days) VALUES
  ('standard', 'Standard Delivery', 49.00, 15.00, 5),
  ('express', 'Express Delivery', 99.00, 25.00, 2),
  ('sameday', 'Same-Day Delivery', 199.00, 35.00, 1)
ON CONFLICT (courier_type) DO UPDATE SET
  label = EXCLUDED.label,
  base_rate = EXCLUDED.base_rate,
  per_kg_rate = EXCLUDED.per_kg_rate,
  estimated_days = EXCLUDED.estimated_days;

-- Deactivate old courier options, upsert local delivery
UPDATE public.shipping_rates SET active = false WHERE courier_type IN ('express', 'sameday', 'standard');

INSERT INTO public.shipping_rates (courier_type, label, base_rate, per_kg_rate, estimated_days, active)
VALUES ('local', 'Local Delivery (Only in Patna)', 69.00, 0.00, 2, true)
ON CONFLICT (courier_type) DO UPDATE
SET label = EXCLUDED.label,
    base_rate = EXCLUDED.base_rate,
    per_kg_rate = EXCLUDED.per_kg_rate,
    estimated_days = EXCLUDED.estimated_days,
    active = EXCLUDED.active;

-- Coupons
INSERT INTO public.coupons (code, description, discount_type, value, min_order, max_discount, active) VALUES
  ('WELCOME50', 'Flat ₹50 off on your first order above ₹200', 'flat', 50.00, 200.00, 50.00, true),
  ('PRINT10', '10% off on orders above ₹500', 'percent', 10.00, 500.00, 200.00, true)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  value = EXCLUDED.value,
  min_order = EXCLUDED.min_order,
  max_discount = EXCLUDED.max_discount,
  active = EXCLUDED.active;

-- Reviews
INSERT INTO public.reviews (name, role, rating, message, avatar_color) VALUES
  ('Aditya Sharma', 'Student, Delhi University', 5, 'I uploaded my thesis at midnight and got it printed and delivered in 2 days. The spiral binding was perfect and the color pages were crisp. Online Print 4U saved my submission deadline!', 'primary'),
  ('Priya Nair', 'Architect, Bangalore', 5, 'The A3 color prints for my portfolio came out beautifully. The live price calculator helped me stay within budget. Highly recommend for professionals who need quality prints fast.', 'emerald'),
  ('Rohan Mehta', 'Startup Founder, Mumbai', 5, 'We use Online Print 4U for all our investor pitch deck printing. The hard binding option gives a premium feel and the courier tracking keeps us informed every step.', 'sky'),
  ('Sneha Reddy', 'Research Scholar, Hyderabad', 5, 'Printed 300 pages of research papers in color. The auto page count feature is brilliant — no more manual counting. Delivered to my hostel without any hassle.', 'amber'),
  ('Karthik Iyer', 'CA Student, Chennai', 4, 'Great service for exam printouts. The double-side printing saved me money and paper. Would love to see more pickup points in the future.', 'primary'),
  ('Ananya Das', 'Marketing Manager, Kolkata', 5, 'The transparent lamination on my presentation covers looked so professional. The whole process from upload to delivery was seamless. My go-to printing service now.', 'emerald')
ON CONFLICT DO NOTHING;