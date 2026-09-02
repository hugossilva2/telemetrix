-- ===== Enums =====
CREATE TYPE public.org_role AS ENUM ('owner', 'instructor', 'student');
CREATE TYPE public.org_kind AS ENUM ('instrutor', 'autoescola');
CREATE TYPE public.lesson_status AS ENUM ('agendada', 'em_andamento', 'concluida', 'cancelada');

-- ===== Tabelas =====
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  kind public.org_kind NOT NULL DEFAULT 'instrutor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
CREATE INDEX organizations_owner_idx ON public.organizations (owner_id);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
CREATE INDEX organization_members_user_idx ON public.organization_members (user_id);

CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  email text,
  role public.org_role NOT NULL DEFAULT 'student',
  student_id uuid,
  created_by uuid NOT NULL,
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT ALL ON public.organization_invites TO service_role;
CREATE INDEX organization_invites_org_idx ON public.organization_invites (org_id);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  phone text,
  photo_path text,
  category text,
  renach text,
  contracted_lessons integer NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
CREATE INDEX students_org_idx ON public.students (org_id);
CREATE INDEX students_user_idx ON public.students (user_id);

ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_student_fk
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 50,
  started_at timestamptz,
  ended_at timestamptz,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  status public.lesson_status NOT NULL DEFAULT 'agendada',
  notes text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  price numeric,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
CREATE INDEX lessons_org_sched_idx ON public.lessons (org_id, scheduled_at DESC);
CREATE INDEX lessons_student_idx ON public.lessons (student_id);
CREATE INDEX lessons_instructor_idx ON public.lessons (instructor_id);

-- ===== updated_at =====
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Funções auxiliares (SECURITY DEFINER, sem recursão) =====
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user_id AND m.org_id = _org_id AND m.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user_id AND m.org_id = _org_id
  )
$$;

/** Dono ou instrutor da escola (quem gerencia alunos e aulas). */
CREATE OR REPLACE FUNCTION public.is_org_staff(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user_id AND m.org_id = _org_id AND m.role IN ('owner', 'instructor')
  )
$$;

/** Cadastros de aluno vinculados ao login atual. */
CREATE OR REPLACE FUNCTION public.my_student_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
$$;

-- Dono entra automaticamente como membro ao criar a escola
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_organization() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_organization_created AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- ===== Convites =====
CREATE OR REPLACE FUNCTION public.get_org_invite(_token text)
RETURNS TABLE (org_name text, org_kind public.org_kind, role public.org_role, student_name text, expired boolean, accepted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.name, o.kind, i.role, s.name,
         i.expires_at < now(), i.accepted_at IS NOT NULL
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.org_id
  LEFT JOIN public.students s ON s.id = i.student_id
  WHERE i.token = _token
$$;

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
  IF _inv.email IS NOT NULL AND lower(_inv.email) <> _email THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (_inv.org_id, _uid, _inv.role)
  ON CONFLICT DO NOTHING;

  IF _inv.role = 'student' AND _inv.student_id IS NOT NULL THEN
    UPDATE public.students SET user_id = _uid WHERE id = _inv.student_id AND user_id IS NULL;
  END IF;

  UPDATE public.organization_invites
     SET accepted_by = _uid, accepted_at = now()
   WHERE id = _inv.id;

  RETURN _inv.org_id;
END;
$$;

-- ===== RLS =====
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_member(auth.uid(), id));
CREATE POLICY "owner creates org" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates org" ON public.organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes org" ON public.organizations FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- organization_members
CREATE POLICY "members read members" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owner manages members" ON public.organization_members FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, 'owner'))
  WITH CHECK (public.has_org_role(auth.uid(), org_id, 'owner'));
CREATE POLICY "member leaves" ON public.organization_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND role <> 'owner');

-- organization_invites
CREATE POLICY "staff manages invites" ON public.organization_invites FOR ALL TO authenticated
  USING (public.is_org_staff(auth.uid(), org_id))
  WITH CHECK (public.is_org_staff(auth.uid(), org_id) AND created_by = auth.uid());

-- students
CREATE POLICY "staff manages students" ON public.students FOR ALL TO authenticated
  USING (public.is_org_staff(auth.uid(), org_id))
  WITH CHECK (public.is_org_staff(auth.uid(), org_id));
CREATE POLICY "student reads self" ON public.students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- lessons
CREATE POLICY "staff manages lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.is_org_staff(auth.uid(), org_id))
  WITH CHECK (public.is_org_staff(auth.uid(), org_id));
CREATE POLICY "student reads own lessons" ON public.lessons FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_student_ids()));

-- aluno vê a viagem vinculada à sua aula
CREATE POLICY "student reads lesson trips" ON public.trips FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.trip_id = trips.id AND l.student_id IN (SELECT public.my_student_ids())
  ));