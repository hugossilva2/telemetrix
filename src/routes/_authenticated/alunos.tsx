import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, GraduationCap, Plus, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors/userMessage";
import { invalidateSchool, useLessons, useMySchool, useStudents } from "@/lib/school/api";
import { LICENSE_CATEGORIES, studentProgress } from "@/lib/school/lessons";
import { SchoolSetupCard } from "@/components/school/SchoolSetupCard";

export const Route = createFileRoute("/_authenticated/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos · Telemetrix" },
      { name: "description", content: "Cadastro de alunos, categoria, RENACH e aulas contratadas x realizadas." },
      { property: "og:title", content: "Alunos · Telemetrix" },
      { property: "og:description", content: "Seus alunos e a evolução de cada um." },
    ],
  }),
  component: AlunosPage,
});

function AlunosPage() {
  const qc = useQueryClient();
  const { school, isLoading: schoolLoading } = useMySchool();
  const students = useStudents(school?.id);
  const lessons = useLessons(school?.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("B");
  const [renach, setRenach] = useState("");
  const [contracted, setContracted] = useState("20");
  const [query, setQuery] = useState("");

  const progressById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof studentProgress>>();
    for (const s of students.data ?? []) {
      map.set(
        s.id,
        studentProgress(
          (lessons.data ?? []).filter((l) => l.student_id === s.id),
          s.contracted_lessons,
        ),
      );
    }
    return map;
  }, [students.data, lessons.data]);

  const list = (students.data ?? []).filter((s) =>
    query.trim() ? s.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!school) throw new Error("Escola não encontrada");
      if (!name.trim()) throw new Error("Informe o nome do aluno.");
      const { error } = await supabase.from("students").insert({
        org_id: school.id,
        name: name.trim(),
        phone: phone.trim() || null,
        category: category || null,
        renach: renach.trim() || null,
        contracted_lessons: Math.max(0, parseInt(contracted || "0", 10) || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno cadastrado!");
      setName("");
      setPhone("");
      setRenach("");
      setOpen(false);
      invalidateSchool(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível cadastrar o aluno.")),
  });

  if (!schoolLoading && !school) {
    return (
      <AppShell title="Alunos" subtitle="Cadastre sua escola para começar">
        <SchoolSetupCard />
      </AppShell>
    );
  }

  return (
    <AppShell title="Alunos" subtitle={school ? school.name : "Carregando…"}>
      <div className="flex gap-2">
        <Input
          placeholder="Buscar aluno"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11"
        />
        <Button type="button" className="h-11 shrink-0" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" /> Novo
        </Button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="card-surface space-y-3 p-4"
        >
          <h2 className="text-sm font-semibold">Novo aluno</h2>
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Nome</Label>
            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-phone">Telefone</Label>
              <Input id="st-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-cat">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="st-cat" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-renach">RENACH / processo</Label>
              <Input id="st-renach" value={renach} onChange={(e) => setRenach(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-contracted">Aulas contratadas</Label>
              <Input
                id="st-contracted"
                type="number"
                inputMode="numeric"
                min="0"
                value={contracted}
                onChange={(e) => setContracted(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={create.isPending}>
              {create.isPending ? "Salvando…" : "Cadastrar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <section className="card-surface p-0">
        {students.isLoading ? (
          <p className="p-4 text-xs text-muted-foreground">Carregando alunos…</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <GraduationCap className="size-8 text-primary" />
            <p className="text-sm font-semibold">Nenhum aluno ainda</p>
            <p className="text-xs text-muted-foreground">
              Cadastre o primeiro aluno e depois agende as aulas em “Aulas”.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {list.map((s) => {
              const p = progressById.get(s.id);
              return (
                <li key={s.id}>
                  <Link
                    to="/alunos/$id"
                    params={{ id: s.id }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{s.name}</span>
                        {s.category && (
                          <span className="rounded-full border border-border/70 px-1.5 text-[10px] text-muted-foreground">
                            cat. {s.category}
                          </span>
                        )}
                        {!s.active && (
                          <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">inativo</span>
                        )}
                        {s.user_id && (
                          <span className="rounded-full bg-success/10 px-1.5 text-[10px] text-success">login</span>
                        )}
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${p?.pct ?? 0}%` }} />
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {p?.done ?? 0}/{s.contracted_lessons} aulas
                        {p?.avgEco != null && ` · Eco ${p.avgEco}`}
                        {p?.nextLessonAt &&
                          ` · próxima ${new Date(p.nextLessonAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
