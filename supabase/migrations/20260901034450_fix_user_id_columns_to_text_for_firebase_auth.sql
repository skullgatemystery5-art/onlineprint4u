/*
# Fix user_id column types from uuid to text for Firebase Auth

## Problem
This app uses Firebase Authentication, so user IDs are Firebase UIDs (28-char
alphanumeric strings like "Fk7m3XQqZabc123defGhi456jkl"), NOT UUIDs.
The orders.user_id and addresses.user_id columns are type `uuid`, which
rejects Firebase UIDs with "invalid input syntax for type uuid".
The insertOrder() function silently catches this error, falls through to
Firebase (which may also fail), and returns null — so the order never saves.

## Fix
Change user_id columns from `uuid` to `text` on orders and addresses tables.
Also remove the `DEFAULT auth.uid()` since there is no Supabase session.
*/

-- Drop policies first (can't alter column with dependent policies)
DROP POLICY IF EXISTS "orders_select_all" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_all" ON public.orders;
DROP POLICY IF EXISTS "orders_update_all" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_all" ON public.orders;

DROP POLICY IF EXISTS "addresses_select_all" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_all" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_all" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_all" ON public.addresses;

-- Change user_id from uuid to text on orders
ALTER TABLE public.orders ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.orders ALTER COLUMN user_id SET DEFAULT '';

-- Change user_id from uuid to text on addresses
ALTER TABLE public.addresses ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.addresses ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.addresses ALTER COLUMN user_id SET DEFAULT '';

-- Recreate policies (same as before — allow anon + authenticated)
CREATE POLICY "orders_select_all" ON public.orders FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "orders_insert_all" ON public.orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "orders_update_all" ON public.orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_all" ON public.orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE POLICY "addresses_select_all" ON public.addresses FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "addresses_insert_all" ON public.addresses FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "addresses_update_all" ON public.addresses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "addresses_delete_all" ON public.addresses FOR DELETE
  TO anon, authenticated USING (true);
