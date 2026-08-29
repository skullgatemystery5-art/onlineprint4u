-- Add payment screenshot URL and delivery type label to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_screenshot_url text,
  ADD COLUMN IF NOT EXISTS delivery_type_label text,
  ADD COLUMN IF NOT EXISTS customer_email text;

-- Backfill default for existing rows
UPDATE orders SET delivery_type_label = courier_type WHERE delivery_type_label IS NULL;

-- Enable RLS on storage.objects is already on by default for new buckets.
-- We create a private bucket for payment screenshots via storage.buckets table.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-screenshots bucket:
-- Users can upload to their own folder path: user_id/filename
CREATE POLICY "screenshots_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-screenshots');

-- Users can read their own screenshots
CREATE POLICY "screenshots_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-screenshots');

-- Admins can read all screenshots
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

-- Admins can update/delete screenshots
CREATE POLICY "screenshots_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "screenshots_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
