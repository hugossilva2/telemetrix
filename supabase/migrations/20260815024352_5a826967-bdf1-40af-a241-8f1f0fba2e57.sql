DROP POLICY IF EXISTS "viewer accepts own invite" ON public.vehicle_shares;

CREATE OR REPLACE FUNCTION public.accept_vehicle_share(_share_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.vehicle_shares
     SET viewer_user_id = auth.uid(),
         accepted_at    = COALESCE(accepted_at, now()),
         viewer_last_seen_at = now()
   WHERE id = _share_id
     AND revoked_at IS NULL
     AND lower(invited_email) = lower(COALESCE(auth.jwt() ->> 'email', ''));
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_vehicle_share(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_vehicle_share(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_vehicle_share_seen(_share_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.vehicle_shares
     SET viewer_last_seen_at = now()
   WHERE id = _share_id
     AND revoked_at IS NULL
     AND (
       viewer_user_id = auth.uid()
       OR lower(invited_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
     );
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_vehicle_share_seen(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_vehicle_share_seen(uuid) TO authenticated;