CREATE TABLE public.vehicle_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  viewer_user_id uuid,
  label text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, invited_email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_shares TO authenticated;
GRANT ALL ON public.vehicle_shares TO service_role;

ALTER TABLE public.vehicle_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own shares" ON public.vehicle_shares
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "viewer reads own invites" ON public.vehicle_shares
  FOR SELECT TO authenticated
  USING (
    revoked_at IS NULL
    AND (
      viewer_user_id = auth.uid()
      OR lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY "viewer accepts own invite" ON public.vehicle_shares
  FOR UPDATE TO authenticated
  USING (
    revoked_at IS NULL
    AND lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    revoked_at IS NULL
    AND lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE TRIGGER update_vehicle_shares_updated_at
  BEFORE UPDATE ON public.vehicle_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_view_vehicle(_vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicle_shares s
    WHERE s.vehicle_id = _vehicle_id
      AND s.revoked_at IS NULL
      AND (
        s.viewer_user_id = auth.uid()
        OR lower(s.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$$;

CREATE POLICY "shared vehicle read" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.can_view_vehicle(id));

CREATE POLICY "shared vehicle pings read" ON public.tracker_pings
  FOR SELECT TO authenticated
  USING (vehicle_id IS NOT NULL AND public.can_view_vehicle(vehicle_id));

CREATE POLICY "shared vehicle events read" ON public.tracker_events
  FOR SELECT TO authenticated
  USING (vehicle_id IS NOT NULL AND public.can_view_vehicle(vehicle_id));

CREATE POLICY "shared vehicle live state read" ON public.device_trip_state
  FOR SELECT TO authenticated
  USING (vehicle_id IS NOT NULL AND public.can_view_vehicle(vehicle_id));