ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS model_year integer,
  ADD COLUMN IF NOT EXISTS engine text,
  ADD COLUMN IF NOT EXISTS gearbox text,
  ADD COLUMN IF NOT EXISTS fuel_kind text NOT NULL DEFAULT 'misto',
  ADD COLUMN IF NOT EXISTS tank_l numeric NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS eco_rpm_min integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS eco_rpm_max integer NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS zero_to_100_s numeric NOT NULL DEFAULT 11.5,
  ADD COLUMN IF NOT EXISTS consumption_ethanol_urban numeric NOT NULL DEFAULT 9.1,
  ADD COLUMN IF NOT EXISTS consumption_ethanol_highway numeric NOT NULL DEFAULT 11.2,
  ADD COLUMN IF NOT EXISTS consumption_gasoline_urban numeric NOT NULL DEFAULT 13.0,
  ADD COLUMN IF NOT EXISTS consumption_gasoline_highway numeric NOT NULL DEFAULT 15.9;

UPDATE public.vehicles
SET model_year = COALESCE(model_year, 2022),
    engine = COALESCE(engine, '1.3 Firefly Flex'),
    gearbox = COALESCE(gearbox, 'Manual de 5 marchas');

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['trips','fuel_logs','expenses','maintenance_records','vehicle_documents','vehicle_checkups','tracker_events','tracker_pings','safe_starts']
  LOOP
    EXECUTE format($f$
      UPDATE public.%I x
      SET vehicle_id = v.id
      FROM (
        SELECT DISTINCT ON (user_id) user_id, id
        FROM public.vehicles
        ORDER BY user_id, created_at
      ) v
      WHERE x.vehicle_id IS NULL AND x.user_id = v.user_id
    $f$, t);
  END LOOP;
END $$;