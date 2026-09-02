import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Leaf, Link2, Play, Route as RouteIcon, Square, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toUserMessage } from "@/lib/errors/userMessage";
import { formatBRL, formatDecimal } from "@/lib/format";
import { formatDateTime } from "@/lib/trips/format";
import { invalidateSchool, useLesson } from "@/lib/school/api";
import { useEndLesson, useStartLesson } from "@/lib/school/actions";
import {
  CHECKLIST_ITEMS,
  CHECKLIST_MARK_LABEL,
  LESSON_STATUS_CLASSES,
  LESSON_STATUS_LABEL,
  matchTripForLesson,
  type ChecklistEntry,
  type ChecklistMark,
} from "@/lib/school/lessons";

export const Route = createFileRoute("/_authenticated/aulas_/$id")({
  head: () => ({
    meta: [
      { title: "Aula · Telemetrix" },
      { name: "description", content: "Detalhe da aula: trajeto gravado, Eco Score, checklist e observações." },
      { property: "og:title", content: "Aula · Telemetrix" },
      { property: "og:description", content: "Detalhe da aula prática." },
    ],
  }),
  component: AulaPage,
});

const MARKS: ChecklistMark[] = ["ok", "atencao", "nao"];
const MARK_CLASS: Record<ChecklistMark, string> = {
  ok: "bg-success/15 text-success border-success/30",
  atencao: "bg-warning/15 text-warning border-warning/30",
  nao: "bg-destructive/15 text-destructive border-destructive/30",
};

function AulaPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: lesson, isLoading } = useLesson(id);
  const startLesson = useStartLesson();
  const endLesson = useEndLesson();

  const [checklist, setChecklist] = useState<ChecklistEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    setChecklist(lesson.checklist);
    setNotes(lesson.notes ?? "");
    setPrice(lesson.price != null ? String(lesson.price) : "");
    setDirty(false);
  }, [lesson]);

  const candidates = useQuery({
    queryKey: ["lesson-trip-candidates", id, lesson?.started_at],
    enabled: !!lesson && !lesson.trip_id && lesson.status === "concluida",
    queryFn: async () => {
      const from = new Date(new Date(lesson!.started_at ?? lesson!.scheduled_at).getTime() - 2 * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from("trips")
        .select("id,start_time,end_time,distance_km,eco_score")
        .gte("start_time", from)
        .not("end_time", "is", null)
        .order("start_time", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  const suggested = useMemo(() => {
    if (!lesson || !candidates.data) return null;
    return matchTripForLesson(
      candidates.data,
      lesson.started_at ?? lesson.scheduled_at,
      lesson.ended_at ?? new Date().toISOString(),
    );
  }, [lesson, candidates.data]);

  const save = useMutation({
    mutationFn: async (patch: Database["public"]["Tables"]["lessons"]["Update"]) => {
      const { error } = await supabase.from("lessons").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      invalidateSchool(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível salvar a aula.")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula removida.");
      invalidateSchool(qc);
      navigate({ to: "/aulas", replace: true });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível remover a aula.")),
  });

  function setMark(itemId: string, mark: ChecklistMark) {
    setChecklist((prev) => {
      const rest = prev.filter((c) => c.id !== itemId);
      const cur = prev.find((c) => c.id === itemId);
      return cur?.mark === mark ? rest : [...rest, { id: itemId, mark }];
    });
    setDirty(true);
  }

  if (isLoading) {
    return (
      <AppShell title="Aula" subtitle="Carregando…">
        <p className="text-xs text-muted-foreground">Carregando…</p>
      </AppShell>
    );
  }
  if (!lesson) {
    return (
      <AppShell title="Aula" subtitle="Não encontrada">
        <Link to="/aulas" className="text-sm text-primary">
          Voltar para aulas
        </Link>
      </AppShell>
    );
  }

  const trip = lesson.trip;
  const p = price ? parseFloat(price.replace(",", ".")) : null;

  return (
    <AppShell title={lesson.student?.name ?? "Aula"} subtitle={formatDateTime(lesson.scheduled_at)}>
      <div className="flex items-center justify-between">
        <Link to="/aulas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="size-3.5" /> Aulas
        </Link>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${LESSON_STATUS_CLASSES[lesson.status]}`}>
          {LESSON_STATUS_LABEL[lesson.status]}
        </span>
      </div>

      {lesson.status === "agendada" && (
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11" onClick={() => startLesson.mutate(lesson)} disabled={startLesson.isPending}>
            <Play className="size-4" /> Iniciar aula
          </Button>
          <Button variant="outline" className="h-11" onClick={() => save.mutate({ status: "cancelada" })}>
            Cancelar aula
          </Button>
        </div>
      )}
      {lesson.status === "em_andamento" && (
        <Button variant="destructive" className="h-11 w-full" onClick={() => endLesson.mutate(lesson)} disabled={endLesson.isPending}>
          <Square className="size-4" /> Encerrar aula
        </Button>
      )}

      {/* Trajeto */}
      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <RouteIcon className="size-4 text-primary" /> Trajeto da aula
        </h2>
        {trip ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-background/35 p-2">
                <p className="text-[10px] text-muted-foreground">Eco Score</p>
                <p className="font-mono text-xl font-bold text-primary">{trip.eco_score != null ? Math.round(trip.eco_score) : "—"}</p>
              </div>
              <div className="rounded-xl bg-background/35 p-2">
                <p className="text-[10px] text-muted-foreground">Distância</p>
                <p className="font-mono text-xl font-bold">{trip.distance_km != null ? `${formatDecimal(trip.distance_km)}` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">km</p>
              </div>
              <div className="rounded-xl bg-background/35 p-2">
                <p className="text-[10px] text-muted-foreground">Eventos</p>
                <p className="font-mono text-xl font-bold">
                  {trip.harsh_brake_count + trip.harsh_accel_count + trip.harsh_corner_count + trip.overspeed_count}
                </p>
              </div>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
              <li>Freadas bruscas: {trip.harsh_brake_count}</li>
              <li>Acelerações fortes: {trip.harsh_accel_count}</li>
              <li>Curvas acentuadas: {trip.harsh_corner_count}</li>
              <li>Excesso de velocidade: {trip.overspeed_count}</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <Link to="/viagens/$id" params={{ id: trip.id }} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
                <Leaf className="size-4" /> Ver mapa e eventos
              </Link>
              <Button variant="ghost" className="h-10 text-xs" onClick={() => save.mutate({ trip_id: null })}>
                Desvincular
              </Button>
            </div>
          </>
        ) : lesson.status === "concluida" ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Nenhuma viagem vinculada. Escolha a viagem gravada durante a aula:
            </p>
            <ul className="mt-2 space-y-1.5">
              {(candidates.data ?? []).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => save.mutate({ trip_id: t.id })}
                    className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-xs ${
                      suggested?.id === t.id ? "border-primary/60 bg-primary/10" : "border-border/70 bg-background/35"
                    }`}
                  >
                    <Link2 className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{formatDateTime(t.start_time)}</span>
                      <span className="text-muted-foreground">
                        {t.distance_km != null ? `${formatDecimal(t.distance_km)} km` : "—"}
                        {t.eco_score != null && ` · Eco ${Math.round(t.eco_score)}`}
                        {suggested?.id === t.id && " · sugerida"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {candidates.isFetched && (candidates.data ?? []).length === 0 && (
                <li className="text-xs text-muted-foreground">Nenhuma viagem fechada nesse horário ainda.</li>
              )}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Ao encerrar, a viagem gravada pelo OBD/rastreador vira o trajeto avaliado desta aula.
          </p>
        )}
      </section>

      {/* Checklist */}
      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Checklist da aula</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Toque para avaliar cada item.</p>
        <ul className="mt-3 space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const cur = checklist.find((c) => c.id === item.id)?.mark;
            return (
              <li key={item.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>
                <div className="flex gap-1">
                  {MARKS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMark(item.id, m)}
                      className={`h-8 rounded-lg border px-2 text-[10px] font-semibold transition-colors ${
                        cur === m ? MARK_CLASS[m] : "border-border/70 text-muted-foreground"
                      }`}
                    >
                      {CHECKLIST_MARK_LABEL[m]}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card-surface space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="ls-notes">Observações do instrutor</Label>
          <Textarea
            id="ls-notes"
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            placeholder="O que foi bem, o que treinar na próxima…"
          />
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ls-price">Valor (R$)</Label>
            <Input
              id="ls-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setDirty(true);
              }}
              className="h-11"
            />
          </div>
          <Button
            type="button"
            variant={lesson.paid ? "outline" : "default"}
            className="h-11"
            onClick={() => save.mutate({ paid: !lesson.paid })}
          >
            <Check className="size-4" /> {lesson.paid ? "Pago" : "Marcar como pago"}
          </Button>
        </div>
        {lesson.price != null && (
          <p className="text-[11px] text-muted-foreground">
            {formatBRL(lesson.price)} · {lesson.paid ? "recebido" : "pendente"}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!dirty || save.isPending}
            onClick={() =>
              save.mutate(
                { checklist: checklist as unknown as Database["public"]["Tables"]["lessons"]["Update"]["checklist"], notes: notes.trim() || null, price: p != null && Number.isFinite(p) ? p : null },
                { onSuccess: () => toast.success("Aula salva.") },
              )
            }
          >
            Salvar
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm("Remover esta aula?")) remove.mutate();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
