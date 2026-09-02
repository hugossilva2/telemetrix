-- 1) Veículos da escola
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS vehicles_org_id_idx ON public.vehicles(org_id) WHERE org_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_org_vehicle_staff(_vehicle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.organization_members m ON m.org_id = v.org_id
    WHERE v.id = _vehicle_id AND m.user_id = auth.uid() AND m.role IN ('owner','instructor')
  )
$$;
REVOKE ALL ON FUNCTION public.is_org_vehicle_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_vehicle_staff(uuid) TO authenticated;

CREATE POLICY "org staff reads fleet vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (org_id IS NOT NULL AND is_org_staff(auth.uid(), org_id));

CREATE POLICY "org staff reads fleet trips" ON public.trips
  FOR SELECT TO authenticated USING (vehicle_id IS NOT NULL AND is_org_vehicle_staff(vehicle_id));

CREATE POLICY "org staff reads fleet fuel" ON public.fuel_logs
  FOR SELECT TO authenticated USING (vehicle_id IS NOT NULL AND is_org_vehicle_staff(vehicle_id));

-- 2) Instrutor <-> carro
CREATE TABLE public.instructor_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, vehicle_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_vehicles TO authenticated;
GRANT ALL ON public.instructor_vehicles TO service_role;
ALTER TABLE public.instructor_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads instructor vehicles" ON public.instructor_vehicles
  FOR SELECT TO authenticated USING (is_org_staff(auth.uid(), org_id));
CREATE POLICY "owner manages instructor vehicles" ON public.instructor_vehicles
  FOR ALL TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'owner'))
  WITH CHECK (has_org_role(auth.uid(), org_id, 'owner'));

-- 3) Nome do membro
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS display_name text;

CREATE OR REPLACE FUNCTION public.org_team(_org_id uuid)
RETURNS TABLE(user_id uuid, role org_role, display_name text, email text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT m.user_id, m.role,
         COALESCE(m.display_name, p.display_name, split_part(u.email, '@', 1)),
         u.email::text, m.created_at
  FROM public.organization_members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = _org_id
    AND m.role IN ('owner','instructor')
    AND public.is_org_staff(auth.uid(), _org_id)
  ORDER BY (m.role = 'owner') DESC, m.created_at
$$;
REVOKE ALL ON FUNCTION public.org_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_team(uuid) TO authenticated;

-- 4) Aceite de convite: nome + perfil de instrutor
CREATE OR REPLACE FUNCTION public.accept_org_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _inv public.organization_invites%ROWTYPE;
  _uid uuid := auth.uid();
  _email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  SELECT * INTO _inv FROM public.organization_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite não encontrado'; END IF;
  IF _inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Convite já utilizado'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'Convite expirado'; END IF;
  IF _inv.email IS NOT NULL AND lower(_inv.email) <> _email THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;

  SELECT display_name INTO _name FROM public.profiles WHERE user_id = _uid;

  INSERT INTO public.organization_members (org_id, user_id, role, display_name)
  VALUES (_inv.org_id, _uid, _inv.role, _name)
  ON CONFLICT DO NOTHING;

  IF _inv.role = 'student' AND _inv.student_id IS NOT NULL THEN
    UPDATE public.students SET user_id = _uid WHERE id = _inv.student_id AND user_id IS NULL;
  END IF;

  IF _inv.role = 'instructor' THEN
    UPDATE public.profiles
       SET mode = 'instrutor', onboarded_at = COALESCE(onboarded_at, now())
     WHERE user_id = _uid;
  END IF;

  UPDATE public.organization_invites
     SET accepted_by = _uid, accepted_at = now()
   WHERE id = _inv.id;

  RETURN _inv.org_id;
END;
$function$;