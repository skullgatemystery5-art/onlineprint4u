-- Deactivate old courier options
UPDATE shipping_rates SET active = false WHERE courier_type IN ('express', 'sameday', 'standard');

-- Upsert single local delivery option
INSERT INTO shipping_rates (courier_type, label, base_rate, per_kg_rate, estimated_days, active)
VALUES ('local', 'Local Delivery (Only in Patna)', 69.00, 0.00, 2, true)
ON CONFLICT (courier_type) DO UPDATE
SET label = EXCLUDED.label,
    base_rate = EXCLUDED.base_rate,
    per_kg_rate = EXCLUDED.per_kg_rate,
    estimated_days = EXCLUDED.estimated_days,
    active = EXCLUDED.active;
