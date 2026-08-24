/*
# Payment Screenshots Storage Bucket

1. Creates a public storage bucket 'payment-screenshots' for uploading payment screenshot images.
2. Sets up RLS policies allowing anon+authenticated to insert and select screenshots.
*/

-- Create the payment-screenshots bucket (public so screenshots can be viewed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Make sure it's public (in case bucket already existed)
UPDATE storage.buckets SET public = true WHERE id = 'payment-screenshots';

-- Drop any old screenshot policies
DROP POLICY IF EXISTS "screenshots_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_insert" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select" ON storage.objects;

-- Allow anyone to upload screenshots (anon + authenticated)
CREATE POLICY "screenshots_insert" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'payment-screenshots');

-- Allow anyone to read screenshots (anon + authenticated)
CREATE POLICY "screenshots_select" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'payment-screenshots');
