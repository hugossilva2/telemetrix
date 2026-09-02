REVOKE EXECUTE ON FUNCTION public.accept_vehicle_share(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_vehicle_share_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_vehicle_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_vehicle_share_seen(uuid) TO authenticated;