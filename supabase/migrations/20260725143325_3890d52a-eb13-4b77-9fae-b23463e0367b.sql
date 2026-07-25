
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove agendamento anterior se existir
DO $$
BEGIN
  PERFORM cron.unschedule('telemetrix-tracker-heartbeat');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'telemetrix-tracker-heartbeat',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://drive-wise-69.lovable.app/api/public/tracker-heartbeat?secret=' ||
           (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FLESPI_WEBHOOK_SECRET' LIMIT 1),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
