CREATE TABLE public.trip_coachings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  grade TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  comparison TEXT,
  highlight TEXT,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_coachings TO authenticated;
GRANT ALL ON public.trip_coachings TO service_role;

ALTER TABLE public.trip_coachings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own trip coachings"
ON public.trip_coachings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Observers can view shared trip coachings"
ON public.trip_coachings FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_coachings.trip_id
    AND t.vehicle_id IS NOT NULL
    AND public.can_view_vehicle(t.vehicle_id)
));