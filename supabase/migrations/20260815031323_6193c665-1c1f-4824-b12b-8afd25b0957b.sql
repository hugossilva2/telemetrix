ALTER TABLE public.device_trip_state
  ADD COLUMN IF NOT EXISTS accum_distance_km NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingest_lease_until TIMESTAMPTZ;

COMMENT ON COLUMN public.device_trip_state.accum_distance_km IS
  'Distância acumulada da viagem aberta, somada ping a ping. Fallback quando vehicle.mileage não está disponível.';

COMMENT ON COLUMN public.device_trip_state.ingest_lease_until IS
  'Lease de execução da ingestão para este device. Enquanto no futuro, outra execução está processando.';

DELETE FROM public.tracker_pings p
USING public.tracker_pings q
WHERE p.vehicle_id = q.vehicle_id
  AND p.recorded_at = q.recorded_at
  AND p.id > q.id;

DELETE FROM public.trips t
USING public.trips u
WHERE t.vehicle_id = u.vehicle_id
  AND t.start_time = u.start_time
  AND t.id > u.id;

ALTER TABLE public.tracker_pings
  ADD CONSTRAINT tracker_pings_unique_sample UNIQUE (vehicle_id, recorded_at);

ALTER TABLE public.trips
  ADD CONSTRAINT trips_unique_start UNIQUE (vehicle_id, start_time);