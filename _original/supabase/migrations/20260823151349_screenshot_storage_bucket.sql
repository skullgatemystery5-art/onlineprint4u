/*
# Payment Screenshots Storage Bucket

1. Creates a public storage bucket 'payment-screenshots' for uploading payment screenshot images.
2. Sets up RLS policies allowing anon+authenticated to insert and select screenshots.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = true WHERE id = 'payment-screenshots';

DROP POLICY IF EXISTS "screenshots_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_insert" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select" ON storage.objects;

CREATE POLICY "screenshots_insert" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "screenshots_select" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'payment-screenshots');