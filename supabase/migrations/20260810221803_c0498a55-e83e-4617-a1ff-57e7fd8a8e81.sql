CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('flespi-poll') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flespi-poll');
SELECT cron.unschedule('tracker-heartbeat') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tracker-heartbeat');

SELECT cron.schedule(
  'flespi-poll',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://telemetrix.lovable.app/api/public/flespi-poll',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dmx6Y2d2ZHBqamxjZ2xsdmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjI1NTcsImV4cCI6MjEwMDM5ODU1N30.dG390hFmTnBgTjozdBYtc0lu4umvrWkoIXkCPHZlCMw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

SELECT cron.schedule(
  'tracker-heartbeat',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://telemetrix.lovable.app/api/public/tracker-heartbeat',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dmx6Y2d2ZHBqamxjZ2xsdmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjI1NTcsImV4cCI6MjEwMDM5ODU1N30.dG390hFmTnBgTjozdBYtc0lu4umvrWkoIXkCPHZlCMw"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);