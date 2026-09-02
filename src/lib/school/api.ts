import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChecklistEntry, LessonStatus } from "./lessons";

export const SCHOOL_KEY = ["school", "mine"] as const;
export const STUDENTS_KEY = ["school", "students"] as const;
export const LESSONS_KEY = ["school", "lessons"] as const;
export const INVITES_KEY = ["school", "invites"] as const;
export const ENROLLMENTS_KEY = ["school", "my-enrollments"] as const;

export type OrgRole = "owner" | "instructor" | "student";
export type OrgKind = "instrutor" | "autoescola";

export interface School {
  id: string;
  name: string;
  kind: OrgKind;
  owner_id: string;
  /** Meu papel na escola. */
  role: OrgRole;
}

export interface StudentRecord {
  id: string;
  org_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  photo_path: string | null;
  category: string | null;
  renach: string | null;
  contracted_lessons: number;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface LessonRecord {
  id: string;
  org_id: string;
  student_id: string;
  instructor_id: string;
  vehicle_id: string | null;
  scheduled_at: string;
  duration_min: number;
  started_at: string | null;
  ended_at: string | null;
  trip_id: string | null;
  status: LessonStatus;
  notes: string | null;
  checklist: ChecklistEntry[];
  price: number | null;
  paid: boolean;
  student?: { name: string } | null;
  vehicle?: { name: string; plate: string } | null;
  trip?: {
    id: string;
    distance_km: number | null;
    eco_score: number | null;
    harsh_brake_count: number;
    harsh_accel_count: number;
    harsh_corner_count: number;
    overspeed_count: number;
  } | null;
}

export interface InviteRecord {
  id: string;
  token: string;
  email: string | null;
  role: OrgRole;
  student_id: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const STUDENT_SELECT =
  "id,org_id,user_id,name,phone,photo_path,category,renach,contracted_lessons,notes,active,created_at";
const LESSON_SELECT =
  "id,org_id,student_id,instructor_id,vehicle_id,scheduled_at,duration_min,started_at,ended_at,trip_id,status,notes,checklist,price,paid,student:students(name),vehicle:vehicles(name,plate),trip:trips(id,distance_km,eco_score,harsh_brake_count,harsh_accel_count,harsh_corner_count,overspeed_count)";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sessão expirada");
  return id;
}

/** Escola em que sou dono ou instrutor (a primeira, nesta fase). */
export function useMySchool() {
  const q = useQuery({
    queryKey: SCHOOL_KEY,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<School | null> => {
      const uid = await currentUserId();
      const { data, error } = await supabase
        .from("organization_members")
        .select("role,org:organizations(id,name,kind,owner_id)")
        .eq("user_id", uid)
        .in("role", ["owner", "instructor"])
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row?.org) return null;
      const org = row.org as { id: string; name: string; kind: OrgKind; owner_id: string };
      return { ...org, role: row.role as OrgRole };
    },
  });
  return { ...q, school: q.data ?? null };
}

/** Garante que exista uma escola para a conta (cria se necessário). */
export function useEnsureSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; kind: OrgKind }): Promise<School> => {
      const uid = await currentUserId();
      const existing = await supabase
        .from("organization_members")
        .select("role,org:organizations(id,name,kind,owner_id)")
        .eq("user_id", uid)
        .in("role", ["owner", "instructor"])
        .limit(1);
      if (existing.error) throw existing.error;
      const row = existing.data?.[0];
      if (row?.org) {
        const org = row.org as { id: string; name: string; kind: OrgKind; owner_id: string };
        if (org.owner_id === uid && org.kind !== input.kind) {
          await supabase.from("organizations").update({ kind: input.kind }).eq("id", org.id);
        }
        return { ...org, kind: input.kind, role: row.role as OrgRole };
      }
      const { data, error } = await supabase
        .from("organizations")
        .insert({ owner_id: uid, name: input.name.trim() || "Minha escola", kind: input.kind })
        .select("id,name,kind,owner_id")
        .single();
      if (error) throw error;
      return { ...data, kind: data.kind as OrgKind, role: "owner" };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHOOL_KEY }),
  });
}

export function useStudents(orgId: string | null | undefined) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<StudentRecord[]> => {
      const { data, error } = await supabase
        .from("students")
        .select(STUDENT_SELECT)
        .eq("org_id", orgId!)
        .order("active", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function normalizeLesson(l: Record<string, unknown>): LessonRecord {
  const raw = l as unknown as LessonRecord & { checklist: unknown; price: unknown };
  return {
    ...raw,
    price: raw.price == null ? null : Number(raw.price),
    checklist: Array.isArray(raw.checklist) ? (raw.checklist as ChecklistEntry[]) : [],
    student: (raw.student as { name: string } | null) ?? null,
    vehicle: (raw.vehicle as { name: string; plate: string } | null) ?? null,
    trip: (raw.trip as LessonRecord["trip"]) ?? null,
  };
}

/** Aulas da escola (últimos 90 dias + futuras). */
export function useLessons(orgId: string | null | undefined, studentId?: string) {
  const from = new Date(Date.now() - 90 * 86_400_000).toISOString();
  return useQuery({
    queryKey: [...LESSONS_KEY, orgId, studentId ?? "all"],
    enabled: !!orgId,
    queryFn: async (): Promise<LessonRecord[]> => {
      let q = supabase
        .from("lessons")
        .select(LESSON_SELECT)
        .eq("org_id", orgId!)
        .gte("scheduled_at", from)
        .order("scheduled_at", { ascending: false })
        .limit(500);
      if (studentId) q = q.eq("student_id", studentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((l) => normalizeLesson(l as unknown as Record<string, unknown>));
    },
  });
}

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: [...LESSONS_KEY, "one", id],
    enabled: !!id,
    queryFn: async (): Promise<LessonRecord | null> => {
      const { data, error } = await supabase.from("lessons").select(LESSON_SELECT).eq("id", id!).maybeSingle();
      if (error) throw error;
      return data ? normalizeLesson(data as unknown as Record<string, unknown>) : null;
    },
  });
}

export function useInvites(orgId: string | null | undefined) {
  return useQuery({
    queryKey: [...INVITES_KEY, orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<InviteRecord[]> => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("id,token,email,role,student_id,accepted_at,expires_at,created_at")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteRecord[];
    },
  });
}

/** Cria (ou reaproveita) um convite de aluno e devolve o link. */
export function useCreateStudentInvite(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; email?: string | null }): Promise<string> => {
      if (!orgId) throw new Error("Escola não encontrada");
      const uid = await currentUserId();
      const open = await supabase
        .from("organization_invites")
        .select("token,expires_at")
        .eq("org_id", orgId)
        .eq("student_id", input.studentId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      if (open.error) throw open.error;
      if (open.data?.[0]) return open.data[0].token;
      const { data, error } = await supabase
        .from("organization_invites")
        .insert({
          org_id: orgId,
          role: "student",
          student_id: input.studentId,
          email: input.email?.trim() || null,
          created_by: uid,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://telemetrix.lovable.app";
  return `${origin}/convite/${token}`;
}

/** Matrículas do login atual como aluno (área "Meu progresso"). */
export function useMyEnrollments() {
  const q = useQuery({
    queryKey: ENROLLMENTS_KEY,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("students")
        .select(`${STUDENT_SELECT},org:organizations(id,name,kind)`)
        .eq("user_id", uid);
      if (error) throw error;
      return (data ?? []) as (StudentRecord & { org: { id: string; name: string; kind: OrgKind } | null })[];
    },
  });
  return { ...q, enrollments: q.data ?? [] };
}

/** Aulas do aluno logado (todas as matrículas). */
export function useMyLessons(enabled: boolean) {
  return useQuery({
    queryKey: [...LESSONS_KEY, "as-student"],
    enabled,
    queryFn: async (): Promise<LessonRecord[]> => {
      const { data, error } = await supabase
        .from("lessons")
        .select(LESSON_SELECT)
        .order("scheduled_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []).map((l) => normalizeLesson(l as unknown as Record<string, unknown>));
    },
  });
}

export function invalidateSchool(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["school"] });
}
