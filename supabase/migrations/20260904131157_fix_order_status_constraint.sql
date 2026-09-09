ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status = ANY (ARRAY['placed', 'processing', 'packed', 'printed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']));