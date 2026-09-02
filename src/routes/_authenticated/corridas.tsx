import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Pencil, PiggyBank, Play, Square, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors/userMessage";
import { formatBRL, formatKm } from "@/lib/format";
import { useActiveVehicle } from "@/lib/vehicles/active";
import { useTelemetry } from "@/hooks/useTelemetry";
import {
  invalidateRides,
  useOpenShift,
  useRides,
  type RideRecord,
} from "@/lib/rides/api";
import {
  RIDE_PLATFORMS,
  dayPeriod,
  platformLabel,
  profitSummary,
  type RidePlatform,
} from "@/lib/rides/profit";

export const Route = createFileRoute("/_authenticated/corridas")({
  head: () => ({
    meta: [
      { title: "Corridas · Telemetrix" },
      { name: "description", content: "Lance corridas Uber/99 em 2 toques e controle seus turnos." },
      { property: "og:title", content: "Corridas · Telemetrix" },
      { property: "og:description", content: "Corridas e turnos do motorista de app." },
    ],
  }),
  component: CorridasPage,
});

const PLATFORM_KEY = "telemetrix.lastRidePlatform";

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function CorridasPage() {
  const qc = useQueryClient();
  const { vehicleId } = useActiveVehicle();
  const { telemetry } = useTelemetry();
  const rides = useRides();
  const { shift: openShift, isLoading: shiftLoading } = useOpenShift();

  const [platform, setPlatform] = useState<RidePlatform>(() => {
    try {
      const v = localStorage.getItem(PLATFORM_KEY);
      return (RIDE_PLATFORMS.some((p) => p.value === v) ? v : "uber") as RidePlatform;
    } catch {
      return "uber";
    }
  });
  const [amount, setAmount] = useState("");
  const [tip, setTip] = useState("");
  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [when, setWhen] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const today = useMemo(() => {
    const p = dayPeriod();
    return profitSummary(
      { rides: rides.data ?? [], shifts: openShift ? [openShift] : [], fuel: [], expenses: [] },
      p,
    );
  }, [rides.data, openShift]);

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setTip("");
    setKm("");
    setMinutes("");
    setWhen("");
    setShowMore(false);
  }

  function startEdit(r: RideRecord) {
    setEditingId(r.id);
    setPlatform(r.platform);
    setAmount(String(r.amount));
    setTip(r.tip ? String(r.tip) : "");
    setKm(r.distance_km != null ? String(r.distance_km) : "");
    setMinutes(r.duration_min != null ? String(r.duration_min) : "");
    const d = new Date(r.occurred_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setWhen(d.toISOString().slice(0, 16));
    setShowMore(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const num = (s: string) => {
    const v = parseFloat(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const value = num(amount);
      if (!(value !== null && value > 0)) throw new Error("Informe o valor da corrida.");
      const payload = {
        platform,
        amount: value,
        tip: num(tip) ?? 0,
        distance_km: num(km),
        duration_min: minutes ? Math.round(num(minutes) ?? 0) : null,
        occurred_at: when ? new Date(when).toISOString() : new Date().toISOString(),
        vehicle_id: vehicleId,
        shift_id: openShift?.id ?? null,
      };
      if (editingId) {
        const { error } = await supabase.from("rides").update(payload).eq("id", editingId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("rides").insert({ user_id: uid, ...payload });
      if (error) throw error;
      try {
        localStorage.setItem(PLATFORM_KEY, platform);
      } catch {
        /* storage indisponível */
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Corrida atualizada!" : "Corrida registrada!");
      resetForm();
      invalidateRides(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível salvar a corrida.")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      if (editingId === id) resetForm();
      toast.success("Corrida removida.");
      invalidateRides(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível remover a corrida.")),
  });

  const toggleShift = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const mileage = telemetry.mileageKm ?? null;
      if (openShift) {
        const { error } = await supabase
          .from("shifts")
          .update({ ended_at: new Date().toISOString(), end_mileage: mileage })
          .eq("id", openShift.id);
        if (error) throw error;
        return "ended" as const;
      }
      const { error } = await supabase
        .from("shifts")
        .insert({ user_id: uid, vehicle_id: vehicleId, start_mileage: mileage });
      if (error) throw error;
      return "started" as const;
    },
    onSuccess: (r) => {
      toast.success(r === "started" ? "Turno iniciado. Boas corridas!" : "Turno encerrado.");
      invalidateRides(qc);
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível atualizar o turno.")),
  });

  const shiftElapsed = openShift
    ? Math.max(0, Math.round((Date.now() - new Date(openShift.started_at).getTime()) / 60000))
    : 0;

  const list = rides.data ?? [];

  return (
    <AppShell title="Corridas" subtitle="Lance em 2 toques e acompanhe o turno">
      {/* Turno */}
      <section className="card-surface flex items-center gap-3 p-4">
        <div
          className={`grid size-11 place-items-center rounded-full ${
            openShift ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Clock className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{openShift ? "Turno em andamento" : "Sem turno aberto"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {openShift
              ? `${Math.floor(shiftElapsed / 60)}h${String(shiftElapsed % 60).padStart(2, "0")} · ${today.rides} corrida(s) hoje`
              : "Inicie para somar horas, km e corridas do período"}
          </p>
        </div>
        <Button
          size="sm"
          variant={openShift ? "outline" : "default"}
          onClick={() => toggleShift.mutate()}
          disabled={shiftLoading || toggleShift.isPending}
        >
          {openShift ? <Square className="size-4" /> : <Play className="size-4" />}
          {openShift ? "Encerrar" : "Iniciar"}
        </Button>
      </section>

      {/* Resumo do dia */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-surface p-3">
          <p className="text-[11px] text-muted-foreground">Hoje</p>
          <p className="mt-1 font-mono text-lg font-semibold">{formatBRL(today.earnings)}</p>
        </div>
        <div className="card-surface p-3">
          <p className="text-[11px] text-muted-foreground">Corridas</p>
          <p className="mt-1 font-mono text-lg font-semibold">{today.rides}</p>
        </div>
        <div className="card-surface p-3">
          <p className="text-[11px] text-muted-foreground">Km</p>
          <p className="mt-1 font-mono text-lg font-semibold">{today.km.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <Link to="/lucro" className="flex items-center gap-3 card-surface p-3 transition-colors hover:bg-accent">
        <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <PiggyBank className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Meu lucro</p>
          <p className="truncate text-xs text-muted-foreground">Ganhos − combustível − gastos · R$/km e R$/hora</p>
        </div>
      </Link>

      {/* Lançamento rápido */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3 card-surface p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{editingId ? "Editar corrida" : "Nova corrida"}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs font-medium text-muted-foreground">
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {RIDE_PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlatform(p.value)}
              className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                platform === p.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/70 bg-background/35 text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ride-amount">Valor (R$)</Label>
            <Input
              id="ride-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="h-12 text-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ride-km">Distância (km)</Label>
            <Input
              id="ride-km"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="h-12 text-lg"
            />
          </div>
        </div>

        {showMore ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ride-tip">Gorjeta</Label>
              <Input id="ride-tip" type="number" inputMode="decimal" step="0.01" min="0" value={tip} onChange={(e) => setTip(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ride-min">Minutos</Label>
              <Input id="ride-min" type="number" inputMode="numeric" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ride-when">Quando</Label>
              <Input id="ride-when" type="datetime-local" value={when || nowLocalInput()} onChange={(e) => setWhen(e.target.value)} className="h-11 text-xs" />
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowMore(true)} className="text-xs font-medium text-primary">
            + gorjeta, minutos e horário
          </button>
        )}

        <Button type="submit" className="h-12 w-full text-base" disabled={save.isPending}>
          {save.isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Registrar corrida"}
        </Button>
      </form>

      {/* Lista */}
      <section className="card-surface p-4">
        <h2 className="text-sm font-semibold">Últimas corridas</h2>
        {rides.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma corrida ainda. Registre a primeira acima.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/60">
            {list.slice(0, 40).map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-center text-[11px] font-semibold">
                  {platformLabel(r.platform)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">
                    {formatBRL(r.amount + r.tip)}
                    {r.tip > 0 && (
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        (+{formatBRL(r.tip)} gorjeta)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {new Date(r.occurred_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {r.distance_km != null && ` · ${formatKm(r.distance_km)}`}
                    {r.duration_min != null && ` · ${r.duration_min} min`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Editar corrida"
                  onClick={() => startEdit(r)}
                  className="rounded-md p-2 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remover corrida"
                  onClick={() => remove.mutate(r.id)}
                  className="rounded-md p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
