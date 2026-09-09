-- Autorização de uso de um veículo (dono ou equipe da organização dona)
CREATE OR REPLACE FUNCTION public.can_use_vehicle(_vehicle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = _vehicle_id
      AND (
        v.user_id = auth.uid()
        OR (v.org_id IS NOT NULL AND public.is_org_staff(auth.uid(), v.org_id))
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_use_vehicle(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_use_vehicle(uuid) TO authenticated, service_role;

-- 1. Compartilhamento: exigir propriedade real do veículo
DROP POLICY IF EXISTS "owner manages own shares" ON public.vehicle_shares;
CREATE POLICY "owner manages own shares" ON public.vehicle_shares
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_shares.vehicle_id AND v.user_id = auth.uid()
    )
  );

-- 2. Convites: nunca papel de proprietário; instrutor só convida aluno
DROP POLICY IF EXISTS "staff manages invites" ON public.organization_invites;
CREATE POLICY "staff manages invites" ON public.organization_invites
  FOR ALL TO authenticated
  USING (public.is_org_staff(auth.uid(), org_id))
  WITH CHECK (
    public.is_org_staff(auth.uid(), org_id)
    AND created_by = auth.uid()
    AND role <> 'owner'
    AND (role = 'student' OR public.has_org_role(auth.uid(), org_id, 'owner'))
  );

CREATE OR REPLACE FUNCTION public.accept_org_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _inv public.organization_invites%ROWTYPE;
  _uid uuid := auth.uid();
  _email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  SELECT * INTO _inv FROM public.organization_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite não encontrado'; END IF;
  IF _inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Convite já utilizado'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'Convite expirado'; END IF;
  IF _inv.role = 'owner' THEN RAISE EXCEPTION 'Convite inválido'; END IF;
  IF _inv.email IS NOT NULL AND lower(_inv.email) <> _email THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (_inv.org_id, _uid, _inv.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  IF _inv.student_id IS NOT NULL THEN
    UPDATE public.students SET user_id = _uid WHERE id = _inv.student_id;
  END IF;

  UPDATE public.organization_invites
     SET accepted_by = _uid, accepted_at = now()
   WHERE id = _inv.id;

  RETURN _inv.org_id;
END;
$$;

-- 4. Um rastreador por veículo
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_flespi_device_unique
  ON public.vehicles (flespi_device_id)
  WHERE flespi_device_id IS NOT NULL;

-- 5. Relações coerentes entre contas
DROP POLICY IF EXISTS "own fuel logs" ON public.fuel_logs;
CREATE POLICY "own fuel logs" ON public.fuel_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (vehicle_id IS NULL OR public.can_use_vehicle(vehicle_id))
  );

DROP POLICY IF EXISTS "own trips" ON public.trips;
CREATE POLICY "own trips" ON public.trips
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (vehicle_id IS NULL OR public.can_use_vehicle(vehicle_id))
  );

DROP POLICY IF EXISTS "staff manages lessons" ON public.lessons;
CREATE POLICY "staff manages lessons" ON public.lessons
  FOR ALL TO authenticated
  USING (public.is_org_staff(auth.uid(), org_id))
  WITH CHECK (
    public.is_org_staff(auth.uid(), org_id)
    AND EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = lessons.student_id AND s.org_id = lessons.org_id
    )
    AND public.is_org_member(lessons.instructor_id, lessons.org_id)
    AND (
      lessons.vehicle_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = lessons.vehicle_id
          AND (v.org_id = lessons.org_id OR v.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "owner manages instructor vehicles" ON public.instructor_vehicles;
CREATE POLICY "owner manages instructor vehicles" ON public.instructor_vehicles
  FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, 'owner'))
  WITH CHECK (
    public.has_org_role(auth.uid(), org_id, 'owner')
    AND public.is_org_member(instructor_vehicles.user_id, instructor_vehicles.org_id)
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = instructor_vehicles.vehicle_id AND v.org_id = instructor_vehicles.org_id
    )
  );