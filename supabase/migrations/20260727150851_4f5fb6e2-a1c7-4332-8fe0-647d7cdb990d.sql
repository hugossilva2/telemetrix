CREATE TYPE public.maintenance_type AS ENUM ('oleo','filtro_oleo','filtro_ar','filtro_combustivel','correia','pneus','freios','velas','revisao','outro');

CREATE TABLE public.maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid,
  type public.maintenance_type NOT NULL DEFAULT 'outro',
  title text,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service numeric NOT NULL DEFAULT 0,
  interval_km numeric,
  interval_months integer,
  cost numeric,
  workshop text,
  notes text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT ALL ON public.maintenance_records TO service_role;

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own maintenance records"
ON public.maintenance_records
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX maintenance_records_user_date_idx ON public.maintenance_records (user_id, service_date DESC);