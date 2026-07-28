CREATE TABLE public.safe_starts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  local_id bigint NOT NULL,
  started_at timestamp with time zone NOT NULL,
  off_minutes integer,
  min_rpm numeric,
  required boolean NOT NULL DEFAULT false,
  ready boolean NOT NULL DEFAULT false,
  ready_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_starts TO authenticated;
GRANT ALL ON public.safe_starts TO service_role;

ALTER TABLE public.safe_starts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own safe starts" ON public.safe_starts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_safe_starts_updated_at
  BEFORE UPDATE ON public.safe_starts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX safe_starts_user_started_idx ON public.safe_starts (user_id, started_at DESC);
CREATE INDEX safe_starts_driver_idx ON public.safe_starts (driver_id);