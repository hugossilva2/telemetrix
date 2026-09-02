import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, Copy, Link2, Pencil, Share2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors/userMessage";
import { formatBRL } from "@/lib/format";
import {
  invalidateSchool,
  inviteUrl,
  useCreateStudentInvite,
  useInvites,
  useLessons,
  useMySchool,
  useStudents,
} from "@/lib/school/api";
import { CHECKLIST_ITEMS, lessonFinancials, studentProgress } from "@/lib/school/lessons";
import { LessonListItem } from "@/components/school/LessonListItem";

export const Route = createFileRoute("/_authenticated/alunos_/$id")({
  head: () => ({
    meta: [
      { title: "Aluno · Telemetrix" },
      { name: "description", content: "Evolução do aluno: aulas feitas, próximas, pontos a treinar e financeiro." },
      { property: "og:title", content: "Aluno · Telemetrix" },
      { property: "og:description", content: "Evolução do aluno." },
    ],
  }),
  component: AlunoPage,
});

function AlunoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { school } = useMySchool();
  const students = useStudents(school?.id);
  const lessons = useLessons(school?.id, id);
  const invites = useInvites(school?.id);
  const createInvite = useCreateStudentInvite(school?.id);
  const student = students.data?.find((s) => s.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [renach, setRenach] = useState("");
  const [contracted, setContracted] = useState("");
  const [notes, setNotes] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!student) return;
    setName(student.name);
    setPhone(student.phone ?? "");
    setCategory(student.category ?? "");
    setRenach(student.renach ?? "");
    setContracted(String(student.contracted_lessons));
    setNotes(student.notes ?? "");
  }, [student]);

  const progress = useMemo(
    () => studentProgress(lessons.data ?? [], student?.contracted_lessons ?? 0),
    [lessons.data, student?.contracted_lessons],
  );
  const fin = useMemo(() => lessonFinancials(lessons.data ?? []), [lessons.data]);
  const openInvite = invites.data?.find(
    (i) => i.student_id === id && !i.accepted_at && (!i.expires_at || new Date(i.expires_at) > new Date()),
  );

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("students")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          category: category.trim() || null,
          renach: renach.trim() || null,
          contracted_lessons: Math.max(0, parseInt(contracted || "0", 10) || 0),
          notes: notes.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno atualizado.");
      setEditing(false);
      invalidateSchool(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível salvar o aluno.")),
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").update({ active: !student?.active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateSchool(qc),
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível atualizar o aluno.")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno removido.");
      invalidateSchool(qc);
      navigate({ to: "/alunos", replace: true });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível remover o aluno.")),
  });

  async function shareInvite() {
    try {
      const token = openInvite?.token ?? (await createInvite.mutateAsync({ studentId: id, email: inviteEmail }));
      const url = inviteUrl(token);
      const text = `Olá${student ? `, ${student.name.split(" ")[0]}` : ""}! Acompanhe suas aulas no Telemetrix: ${url}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Convite Telemetrix", text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link do convite copiado!");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(toUserMessage(e as Error, "Não foi possível gerar o convite."));
    }
  }

  if (students.isLoading) {
    return (
      <AppShell title="Aluno" subtitle="Carregando…">
        <p className="text-xs text-muted-foreground">Carregando…</p>
      </AppShell>
    );
  }
  if (!student) {
    return (
      <AppShell title="Aluno" subtitle="Não encontrado">
        <Link to="/alunos" className="text-sm text-primary">
          Voltar para alunos
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={student.name} subtitle={[student.category && `Categoria ${student.category}`, student.renach && `RENACH ${student.renach}`].filter(Boolean).join(" · ") || "Aluno"}>
      <Link to="/alunos" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Alunos
      </Link>

      <section className="card-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Aulas realizadas</p>
            <p className="font-mono text-3xl font-bold">
              {progress.done}
              <span className="text-base font-medium text-muted-foreground">/{student.contracted_lessons}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Eco Score médio</p>
            <p className="font-mono text-2xl font-semibold text-primary">{progress.avgEco ?? "—"}</p>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {progress.remaining > 0 ? `${progress.remaining} restantes` : "Carga contratada concluída"}
          {progress.scheduled > 0 && ` · ${progress.scheduled} agendada${progress.scheduled === 1 ? "" : "s"}`}
        </p>
        {progress.weakSpots.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Pontos a treinar</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {progress.weakSpots.map((w) => (
                <span key={w.id} className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
                  {CHECKLIST_ITEMS.find((c) => c.id === w.id)?.label ?? w.id}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/aulas"
            search={{ aluno: id }}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground"
          >
            <CalendarPlus className="size-4" /> Agendar aula
          </Link>
          <Button type="button" variant="outline" className="h-10" onClick={() => setEditing((v) => !v)}>
            <Pencil className="size-4" /> Editar
          </Button>
        </div>
      </section>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="card-surface space-y-3 p-4"
        >
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value.toUpperCase())} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>RENACH</Label>
              <Input value={renach} onChange={(e) => setRenach(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Aulas contratadas</Label>
              <Input type="number" min="0" value={contracted} onChange={(e) => setContracted(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={() => toggleActive.mutate()}>
              {student.active ? "Inativar" : "Reativar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm("Remover este aluno e todas as aulas dele?")) remove.mutate();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </form>
      )}

      <section className="card-surface p-4">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Acesso do aluno</h2>
        </div>
        {student.user_id ? (
          <p className="mt-1 text-xs text-success">O aluno já entrou e vê a área “Meu progresso”.</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Envie o link; o aluno cria a conta e passa a ver aulas, trajetos e a pontuação de direção.
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                type="email"
                placeholder="E-mail (opcional, restringe o convite)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-10 text-sm"
                disabled={!!openInvite}
              />
              <Button type="button" className="h-10 shrink-0" onClick={shareInvite} disabled={createInvite.isPending}>
                <Share2 className="size-4" /> {openInvite ? "Reenviar" : "Convidar"}
              </Button>
            </div>
            {openInvite && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteUrl(openInvite.token)).then(() => toast.success("Link copiado!"))}
                className="mt-2 flex w-full items-center gap-2 truncate rounded-lg bg-muted/60 px-2 py-1.5 text-left text-[11px] text-muted-foreground"
              >
                <Copy className="size-3 shrink-0" />
                <span className="truncate">{inviteUrl(openInvite.token)}</span>
              </button>
            )}
          </>
        )}
      </section>

      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Financeiro</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-background/35 p-2">
            <p className="text-[10px] text-muted-foreground">Faturado</p>
            <p className="font-mono text-sm font-semibold">{formatBRL(fin.billed)}</p>
          </div>
          <div className="rounded-xl bg-background/35 p-2">
            <p className="text-[10px] text-muted-foreground">Recebido</p>
            <p className="font-mono text-sm font-semibold text-success">{formatBRL(fin.received)}</p>
          </div>
          <div className="rounded-xl bg-background/35 p-2">
            <p className="text-[10px] text-muted-foreground">Pendente</p>
            <p className={`font-mono text-sm font-semibold ${fin.pending > 0 ? "text-warning" : ""}`}>{formatBRL(fin.pending)}</p>
          </div>
        </div>
      </section>

      <section className="card-surface p-0">
        <h2 className="px-4 pt-4 text-sm font-semibold">Aulas</h2>
        {(lessons.data ?? []).length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">Nenhuma aula registrada.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border/60">
            {(lessons.data ?? []).map((l) => (
              <LessonListItem key={l.id} lesson={l} hideStudent />
            ))}
          </ul>
        )}
      </section>

      {student.notes && (
        <section className="card-surface p-4">
          <h2 className="text-sm font-semibold">Observações</h2>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{student.notes}</p>
        </section>
      )}
    </AppShell>
  );
}
