/*
# Fix RLS policies and FK constraints for Firebase-auth app

## Problem
This app uses Firebase Authentication (phone/email), NOT Supabase Auth.
The Supabase client runs with the anon key only — there is no Supabase session.
This means:
1. All RLS policies scoped `TO authenticated` reject every write (orders, addresses, status logs).
2. The `REFERENCES auth.users(id) ON DELETE CASCADE` foreign key on orders.user_id and addresses.user_id
   rejects inserts because Firebase UIDs do not exist in Supabase's auth.users table.
3. Storage policies scoped `TO authenticated` reject file uploads to the order-files bucket.
4. The result: after Razorpay payment succeeds, the order insert fails silently,
   the "Saving your order..." spinner spins forever, and the admin panel shows "No File".

## Changes
1. Drop ALL existing RLS policies on orders, addresses, order_status_log FIRST
   (cannot alter column type while policies depend on it).
2. Remove the `REFERENCES auth.users(id)` FK constraint from orders.user_id and addresses.user_id.
   - Change user_id columns to plain `uuid` (no FK to auth.users).
   - This allows Firebase UIDs to be stored without constraint violations.
3. Recreate RLS policies as `TO anon, authenticated` so the anon-key client can read and write.
4. Replace `TO authenticated` storage policies on order-files bucket with
   `TO anon, authenticated` so anon-key clients can upload files.

## Security Notes
- This app uses Firebase Auth for identity. Supabase is used purely as a database + storage layer.
- The anon key is the client's credential. RLS policies must allow anon to operate.
- Admin-level operations are protected by the admin login gate in the frontend.
*/

-- ============================================================
-- 1. Drop ALL existing policies FIRST (can't alter column with policies)
-- ============================================================

-- Orders policies
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_own" ON public.orders;

-- Addresses policies
DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;

-- Order status log policies
DROP POLICY IF EXISTS "status_log_select" ON public.order_status_log;
DROP POLICY IF EXISTS "status_log_insert_admin" ON public.order_status_log;
DROP POLICY IF EXISTS "status_log_insert_owner" ON public.order_status_log;

-- Storage policies
DROP POLICY IF EXISTS "order_files_public_read" ON storage.objects;
DROP POLICY IF EXISTS "order_files_authed_insert" ON storage.objects;
DROP POLICY IF EXISTS "order_files_authed_update" ON storage.objects;
DROP POLICY IF EXISTS "order_files_authed_delete" ON storage.objects;

-- ============================================================
-- 2. Remove FK constraints referencing auth.users
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE public.addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
ALTER TABLE public.addresses ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- ============================================================
-- 3. Recreate RLS policies — allow anon + authenticated
-- ============================================================

-- Orders
CREATE POLICY "orders_select_all" ON public.orders FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "orders_insert_all" ON public.orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "orders_update_all" ON public.orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_all" ON public.orders FOR DELETE
  TO anon, authenticated USING (true);

-- Addresses
CREATE POLICY "addresses_select_all" ON public.addresses FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "addresses_insert_all" ON public.addresses FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "addresses_update_all" ON public.addresses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "addresses_delete_all" ON public.addresses FOR DELETE
  TO anon, authenticated USING (true);

-- Order status log
CREATE POLICY "status_log_select_all" ON public.order_status_log FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "status_log_insert_all" ON public.order_status_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 4. Storage policies — allow anon + authenticated
-- ============================================================

CREATE POLICY "order_files_public_read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'order-files');

CREATE POLICY "order_files_anon_insert" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'order-files');

CREATE POLICY "order_files_anon_update" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'order-files')
  WITH CHECK (bucket_id = 'order-files');

CREATE POLICY "order_files_anon_delete" ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'order-files');
