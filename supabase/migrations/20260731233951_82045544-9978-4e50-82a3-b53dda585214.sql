CREATE TABLE public.vehicle_checkups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  item text NOT NULL,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  mileage_km numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_checkups TO authenticated;
GRANT ALL ON public.vehicle_checkups TO service_role;

ALTER TABLE public.vehicle_checkups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own vehicle checkups" ON public.vehicle_checkups
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX vehicle_checkups_user_item_idx ON public.vehicle_checkups (user_id, item, checked_at DESC);

CREATE TRIGGER update_vehicle_checkups_updated_at
  BEFORE UPDATE ON public.vehicle_checkups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();