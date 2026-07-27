ALTER TYPE public.tracker_event_type ADD VALUE IF NOT EXISTS 'geofence_enter';

ALTER TABLE public.favorite_places ALTER COLUMN geofence_radius_m SET DEFAULT 500;

CREATE TABLE public.place_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL REFERENCES public.favorite_places(id) ON DELETE CASCADE,
  trigger text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT true,
  url text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  body_json text,
  header_name text,
  header_value text,
  cooldown_seconds integer NOT NULL DEFAULT 120,
  last_fired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_automations_trigger_check CHECK (trigger IN ('enter','exit')),
  CONSTRAINT place_automations_method_check CHECK (method IN ('GET','POST')),
  CONSTRAINT place_automations_unique UNIQUE (place_id, trigger)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_automations TO authenticated;
GRANT ALL ON public.place_automations TO service_role;
ALTER TABLE public.place_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own place automations" ON public.place_automations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_place_automations_updated_at BEFORE UPDATE ON public.place_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  automation_id uuid REFERENCES public.place_automations(id) ON DELETE SET NULL,
  place_id uuid,
  trigger text,
  status_code integer,
  ok boolean NOT NULL DEFAULT false,
  error text,
  manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own automation runs read" ON public.automation_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own automation runs delete" ON public.automation_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_place_automations_place ON public.place_automations(place_id);
CREATE INDEX idx_automation_runs_user_created ON public.automation_runs(user_id, created_at DESC);