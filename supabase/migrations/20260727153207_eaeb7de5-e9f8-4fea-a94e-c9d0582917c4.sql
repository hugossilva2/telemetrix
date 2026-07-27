ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS eco_score numeric,
  ADD COLUMN IF NOT EXISTS harsh_brake_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS harsh_accel_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS harsh_corner_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overspeed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS high_rpm_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idle_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wasted_fuel_liters numeric,
  ADD COLUMN IF NOT EXISTS wasted_cost numeric,
  ADD COLUMN IF NOT EXISTS eco_events jsonb NOT NULL DEFAULT '[]'::jsonb;