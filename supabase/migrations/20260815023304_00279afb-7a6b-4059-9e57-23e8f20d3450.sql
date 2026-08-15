ALTER TABLE public.device_trip_state
  ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ;

COMMENT ON COLUMN public.device_trip_state.last_ping_at IS
  'Instante do último tracker_pings gravado. Separado de last_message_at, que avança a cada mensagem recebida.';