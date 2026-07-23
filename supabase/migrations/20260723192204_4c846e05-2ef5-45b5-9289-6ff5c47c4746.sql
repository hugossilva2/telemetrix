ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS avg_speed_kmh numeric,
  ADD COLUMN IF NOT EXISTS max_speed_kmh numeric,
  ADD COLUMN IF NOT EXISTS mileage_at_start numeric,
  ADD COLUMN IF NOT EXISTS mileage_at_end numeric,
  ADD COLUMN IF NOT EXISTS fuel_liters numeric,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS avg_consumption_kmpl numeric NOT NULL DEFAULT 10;