/*
# Online Print 4U — Seed Default Reference Data

Populates the reference tables with the app's default catalog so the homepage,
price calculator, courier selector, coupons, and reviews work out of the box.

1. pricing_rates
- 16 print-per-page rows (4 GSM x B&W/Color x Single/Double).
- 5 binding rows.
- lamination + premium-photo add-on rows.
2. shipping_rates
- standard, express, sameday courier tiers.
3. coupons
- WELCOME50 (flat 50 off 200+), PRINT10 (10% off 500+).
4. reviews
- 6 default customer testimonials for the homepage.

All inserts use ON CONFLICT ... DO UPDATE so this is safe to re-run.
*/

-- Print per-page rates
INSERT INTO public.pricing_rates (category, key, label, price, unit) VALUES
  ('print_per_page', '70_bw_single', '70 GSM Economy B&W One Side', 0.90, 'page'),
  ('print_per_page', '70_bw_double', '70 GSM Economy B&W Both Sides', 0.40, 'page'),
  ('print_per_page', '70_color_single', '70 GSM Economy Color One Side', 5.00, 'page'),
  ('print_per_page', '70_color_double', '70 GSM Economy Color Both Sides', 4.00, 'page'),
  ('print_per_page', '75_bw_single', '75 GSM Standard B&W One Side', 1.00, 'page'),
  ('print_per_page', '75_bw_double', '75 GSM Standard B&W Both Sides', 0.60, 'page'),
  ('print_per_page', '75_color_single', '75 GSM Standard Color One Side', 6.00, 'page'),
  ('print_per_page', '75_color_double', '75 GSM Standard Color Both Sides', 5.00, 'page'),
  ('print_per_page', '85_bw_single', '85 GSM Plus B&W One Side', 1.70, 'page'),
  ('print_per_page', '85_bw_double', '85 GSM Plus B&W Both Sides', 1.50, 'page'),
  ('print_per_page', '85_color_single', '85 GSM Plus Color One Side', 7.00, 'page'),
  ('print_per_page', '85_color_double', '85 GSM Plus Color Both Sides', 6.00, 'page'),
  ('print_per_page', '100_bw_single', '100 GSM Premium B&W One Side', 3.00, 'page'),
  ('print_per_page', '100_bw_double', '100 GSM Premium B&W Both Sides', 2.50, 'page'),
  ('print_per_page', '100_color_single', '100 GSM Premium Color One Side', 8.00, 'page'),
  ('print_per_page', '100_color_double', '100 GSM Premium Color Both Sides', 7.00, 'page')
ON CONFLICT (category, key) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label;

-- Binding rates
INSERT INTO public.pricing_rates (category, key, label, price, unit) VALUES
  ('binding', 'none', 'No Binding', 0.00, 'copy'),
  ('binding', 'spiral', 'Spiral Binding', 40.00, 'copy'),
  ('binding', 'soft', 'Soft Binding', 100.00, 'copy'),
  ('binding', 'hard', 'Hard Binding', 100.00, 'copy'),
  ('binding', 'thesis', 'Thesis Hard Binding', 350.00, 'copy')
ON CONFLICT (category, key) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label;

-- Add-ons
INSERT INTO public.pricing_rates (category, key, label, price, unit) VALUES
  ('addons', 'premium_photo', 'Premium Photo Prints', 25.00, 'page'),
  ('lamination', 'none', 'No Lamination', 0.00, 'copy'),
  ('lamination', 'transparent', 'Transparent Cover', 15.00, 'copy')
ON CONFLICT (category, key) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label;

-- Shipping rates
INSERT INTO public.shipping_rates (courier_type, label, base_rate, per_kg_rate, estimated_days) VALUES
  ('standard', 'Standard Delivery', 49.00, 15.00, 5),
  ('express', 'Express Delivery', 99.00, 25.00, 2),
  ('sameday', 'Same-Day Delivery', 199.00, 35.00, 1)
ON CONFLICT (courier_type) DO UPDATE SET
  label = EXCLUDED.label,
  base_rate = EXCLUDED.base_rate,
  per_kg_rate = EXCLUDED.per_kg_rate,
  estimated_days = EXCLUDED.estimated_days;

-- Coupons
INSERT INTO public.coupons (code, description, discount_type, value, min_order, max_discount, active) VALUES
  ('WELCOME50', 'Flat ₹50 off on your first order above ₹200', 'flat', 50.00, 200.00, 50.00, true),
  ('PRINT10', '10% off on orders above ₹500', 'percent', 10.00, 500.00, 200.00, true)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  value = EXCLUDED.value,
  min_order = EXCLUDED.min_order,
  max_discount = EXCLUDED.max_discount,
  active = EXCLUDED.active;

-- Reviews
INSERT INTO public.reviews (name, role, rating, message, avatar_color) VALUES
  ('Aditya Sharma', 'Student, Delhi University', 5, 'I uploaded my thesis at midnight and got it printed and delivered in 2 days. The spiral binding was perfect and the color pages were crisp. Online Print 4U saved my submission deadline!', 'primary'),
  ('Priya Nair', 'Architect, Bangalore', 5, 'The A3 color prints for my portfolio came out beautifully. The live price calculator helped me stay within budget. Highly recommend for professionals who need quality prints fast.', 'emerald'),
  ('Rohan Mehta', 'Startup Founder, Mumbai', 5, 'We use Online Print 4U for all our investor pitch deck printing. The hard binding option gives a premium feel and the courier tracking keeps us informed every step.', 'sky'),
  ('Sneha Reddy', 'Research Scholar, Hyderabad', 5, 'Printed 300 pages of research papers in color. The auto page count feature is brilliant — no more manual counting. Delivered to my hostel without any hassle.', 'amber'),
  ('Karthik Iyer', 'CA Student, Chennai', 4, 'Great service for exam printouts. The double-side printing saved me money and paper. Would love to see more pickup points in the future.', 'primary'),
  ('Ananya Das', 'Marketing Manager, Kolkata', 5, 'The transparent lamination on my presentation covers looked so professional. The whole process from upload to delivery was seamless. My go-to printing service now.', 'emerald')
ON CONFLICT DO NOTHING;