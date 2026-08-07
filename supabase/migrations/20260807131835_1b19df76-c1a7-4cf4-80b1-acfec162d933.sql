REVOKE ALL ON FUNCTION public.current_plan(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_plan(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.current_plan(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.current_plan(UUID) TO service_role;