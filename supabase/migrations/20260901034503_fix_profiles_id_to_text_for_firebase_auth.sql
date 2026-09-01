/*
# Fix profiles.id column from uuid to text for Firebase Auth

Same problem as orders.user_id — Firebase UIDs are not UUIDs.
The profiles table has id as uuid with a FK to auth.users(id).
This prevents upsertProfile from working with Firebase UIDs.
*/

-- Drop policies first
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Drop FK constraint to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Change id from uuid to text
ALTER TABLE public.profiles ALTER COLUMN id TYPE text USING id::text;

-- Recreate policies — allow anon + authenticated (Firebase auth, no Supabase session)
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "profiles_insert_all" ON public.profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "profiles_update_all" ON public.profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
