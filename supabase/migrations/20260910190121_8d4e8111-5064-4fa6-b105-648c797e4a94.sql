-- Retenção de dados de localização e histórico técnico: pontos do rastreador e
-- execuções de automação não precisam ficar guardados para sempre. As viagens
-- (com traçado já consolidado em route_data) permanecem intactas.

CREATE OR REPLACE FUNCTION public.purge_old_telemetry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.tracker_pings WHERE recorded_at < now() - interval '90 days';
  DELETE FROM public.automation_runs WHERE created_at < now() - interval '180 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_telemetry() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'purge-old-telemetry',
  '17 4 * * *',
  $$SELECT public.purge_old_telemetry();$$
);