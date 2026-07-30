REVOKE ALL ON FUNCTION public.can_view_vehicle(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_vehicle(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_vehicle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_vehicle(uuid) TO service_role;