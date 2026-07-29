ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS obd_device_name text,
  ADD COLUMN IF NOT EXISTS obd_device_id text,
  ADD COLUMN IF NOT EXISTS obd_first_paired_at timestamp with time zone;