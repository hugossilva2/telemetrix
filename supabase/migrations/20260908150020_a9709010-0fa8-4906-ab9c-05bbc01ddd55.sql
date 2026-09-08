-- lovable-cron-fallback-reviewed: 288 runs/day; job pre-existente recriado apenas para trocar a autenticacao pelo segredo do vault
DO $$
BEGIN
  PERFORM cron.unschedule('tracker-heartbeat');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'tracker-heartbeat',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://telemetrix.lovable.app/api/public/tracker-heartbeat?secret=' ||
           (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FLESPI_WEBHOOK_SECRET' LIMIT 1),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $cron$
);