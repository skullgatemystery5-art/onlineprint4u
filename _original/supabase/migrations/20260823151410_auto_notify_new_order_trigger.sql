/*
# Auto-notify on new order

Creates a trigger function that fires the notify-order edge function
whenever a new row is inserted into the orders table.
*/

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_payload jsonb;
BEGIN
  SELECT value INTO v_supabase_url FROM public.site_settings WHERE key = 'supabase_url';
  SELECT value INTO v_anon_key FROM public.site_settings WHERE key = 'supabase_anon_key';

  IF v_supabase_url IS NULL OR v_anon_key IS NULL THEN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_anon_key := current_setting('app.supabase_anon_key', true);
  END IF;

  IF v_supabase_url IS NULL OR v_anon_key IS NULL THEN
    RAISE NOTICE 'Supabase URL or anon key not configured. Skipping notification.';
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'order', row_to_json(NEW),
    'ownerEmail', 'contact@onlineprint4u.in',
    'ownerWhatsApp', '917858093865'
  );

  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-order',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := v_payload
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net not available or request failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_order ON public.orders;
CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

INSERT INTO public.site_settings (key, value, description)
VALUES
  ('supabase_url', '', 'Supabase project URL for edge function calls (auto-filled)'),
  ('supabase_anon_key', '', 'Supabase anon key for edge function calls (auto-filled)')
ON CONFLICT (key) DO NOTHING;