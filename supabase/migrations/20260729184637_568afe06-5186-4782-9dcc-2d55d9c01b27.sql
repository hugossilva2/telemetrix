ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS hardware_source text NOT NULL DEFAULT 'fmc003';

CREATE OR REPLACE FUNCTION public.validate_trip_hardware_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hardware_source NOT IN ('fmc003', 'elm327') THEN
    RAISE EXCEPTION 'hardware_source inválido: %', NEW.hardware_source;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_trip_hardware_source ON public.trips;
CREATE TRIGGER validate_trip_hardware_source
BEFORE INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.validate_trip_hardware_source();