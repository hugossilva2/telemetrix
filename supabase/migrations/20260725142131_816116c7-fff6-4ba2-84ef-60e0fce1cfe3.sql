
-- Enum de tipos de evento
CREATE TYPE public.tracker_event_type AS ENUM (
  'ignition_on',
  'ignition_off',
  'motion_off_ignition',
  'geofence_exit',
  'signal_lost'
);

-- Tabela de eventos de segurança
CREATE TABLE public.tracker_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type public.tracker_event_type NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_id UUID REFERENCES public.favorite_places(id) ON DELETE SET NULL,
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tracker_events_user_time ON public.tracker_events(user_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_events TO authenticated;
GRANT ALL ON public.tracker_events TO service_role;
ALTER TABLE public.tracker_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracker events" ON public.tracker_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Histórico automático de pings (posições)
CREATE TABLE public.tracker_pings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_kmh NUMERIC,
  ignition BOOLEAN,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tracker_pings_user_time ON public.tracker_pings(user_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_pings TO authenticated;
GRANT ALL ON public.tracker_pings TO service_role;
ALTER TABLE public.tracker_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracker pings" ON public.tracker_pings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Push subscriptions (multi-device)
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subs" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Extensões em favorite_places (geofence)
ALTER TABLE public.favorite_places
  ADD COLUMN IF NOT EXISTS geofence_radius_m INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN NOT NULL DEFAULT false;

-- Extensões em vehicles (modo rastreador + toggles de alertas)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS tracker_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_ignition BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_motion_off BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_geofence BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_signal_lost BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signal_lost_notified_at TIMESTAMPTZ;

-- Estado interno de geofence por veículo (mapa place_id -> bool)
ALTER TABLE public.device_trip_state
  ADD COLUMN IF NOT EXISTS geofence_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
