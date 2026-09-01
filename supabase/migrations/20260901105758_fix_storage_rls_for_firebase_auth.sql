-- The app uses Firebase Phone OTP for authentication, NOT Supabase Auth.
-- The Supabase client uses the anon key with no Supabase session, so
-- storage policies scoped to "authenticated" role block all uploads.
-- Allow anon role to upload/update/delete in the order-files bucket
-- so Firebase-authenticated users can upload their print documents.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "order_files_authed_insert" ON storage.objects;
DROP POLICY IF EXISTS "order_files_authed_update" ON storage.objects;
DROP POLICY IF EXISTS "order_files_authed_delete" ON storage.objects;

-- Allow anon + authenticated to INSERT (upload) files
CREATE POLICY "order_files_public_insert" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'order-files');

-- Allow anon + authenticated to UPDATE files
CREATE POLICY "order_files_public_update" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'order-files')
  WITH CHECK (bucket_id = 'order-files');

-- Allow anon + authenticated to DELETE files
CREATE POLICY "order_files_public_delete" ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'order-files');
