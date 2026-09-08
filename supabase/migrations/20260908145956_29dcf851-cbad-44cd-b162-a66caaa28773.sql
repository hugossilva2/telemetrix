-- lovable-cron-fallback-reviewed: 720 runs/day; job pre-existente recriado apenas para trocar a autenticacao pelo segredo do vault
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('flespi-poll');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'flespi-poll',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://telemetrix.lovable.app/api/public/flespi-poll?secret=' ||
           (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FLESPI_WEBHOOK_SECRET' LIMIT 1),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $cron$
);