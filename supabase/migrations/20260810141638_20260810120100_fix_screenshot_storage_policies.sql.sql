-- Replace the select policy to allow admins to read all screenshots
-- and users to read only their own (path starts with their user_id)
DROP POLICY IF EXISTS "screenshots_select_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_select_admin" ON storage.objects;

CREATE POLICY "screenshots_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "screenshots_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Also allow users to insert only into their own folder
DROP POLICY IF EXISTS "screenshots_insert_own" ON storage.objects;
CREATE POLICY "screenshots_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
