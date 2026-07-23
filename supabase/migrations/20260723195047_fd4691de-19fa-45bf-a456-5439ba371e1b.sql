
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS flespi_device_id text;

CREATE TABLE IF NOT EXISTS public.device_trip_state (
  device_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  vehicle_id uuid,
  ignition_on boolean,
  start_time timestamptz,
  start_lat double precision,
  start_lng double precision,
  mileage_at_start numeric,
  last_lat double precision,
  last_lng double precision,
  last_mileage numeric,
  max_speed_kmh numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.device_trip_state TO authenticated;
GRANT ALL ON public.device_trip_state TO service_role;
ALTER TABLE public.device_trip_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own device state" ON public.device_trip_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
