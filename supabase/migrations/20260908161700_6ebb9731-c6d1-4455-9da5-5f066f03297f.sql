CREATE UNIQUE INDEX IF NOT EXISTS trips_vehicle_end_time_key
  ON public.trips (vehicle_id, end_time)
  WHERE vehicle_id IS NOT NULL AND end_time IS NOT NULL;