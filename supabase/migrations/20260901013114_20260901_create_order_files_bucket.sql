/*
# Create order-files storage bucket

1. Storage
- Creates a public bucket `order-files` for customer-uploaded print documents.
- Files are accessible via public URLs so the admin panel can display download links.
2. Security
- Public read allowed (anyone with the URL can download).
- Authenticated users can upload to their own folder path.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-files', 'order-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
DROP POLICY IF EXISTS "order_files_public_read" ON storage.objects;
CREATE POLICY "order_files_public_read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'order-files');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "order_files_authed_insert" ON storage.objects;
CREATE POLICY "order_files_authed_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-files');

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "order_files_authed_update" ON storage.objects;
CREATE POLICY "order_files_authed_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'order-files')
  WITH CHECK (bucket_id = 'order-files');

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "order_files_authed_delete" ON storage.objects;
CREATE POLICY "order_files_authed_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-files');