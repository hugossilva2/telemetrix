import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Car, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  useActiveVehicle,
  useInvalidateVehicles,
  type VehicleRecord,
} from "@/lib/vehicles/active";

export const Route = createFileRoute("/_authenticated/veiculos")({
  head: () => ({
    meta: [
      { title: "Meus veículos · Telemetrix" },
      {
        name: "description",
        content: "Cadastre vários veículos e escolha qual está sendo monitorado.",
      },
      { property: "og:title", content: "Meus veículos · Telemetrix" },
      {
        property: "og:description",
        content: "Cadastre vários veículos e escolha qual está sendo monitorado.",
      },
    ],
  }),
  component: VeiculosPage,
});

interface FormState {
  name: string;
  plate: string;
  mileage: string;
  consumption: string;
  modelYear: string;
  engine: string;
  gearbox: string;
  tankL: string;
  ecoRpmMin: string;
  ecoRpmMax: string;
  deviceId: string;
}

const EMPTY: FormState = {
  name: "",
  plate: "",
  mileage: "0",
  consumption: "10",
  modelYear: "",
  engine: "",
  gearbox: "",
  tankL: "",
  ecoRpmMin: "",
  ecoRpmMax: "",
  deviceId: "",
};

function fromRecord(v: VehicleRecord): FormState {
  return {
    name: v.name ?? "",
    plate: v.plate ?? "",
    mileage: String(v.current_mileage ?? 0),
    consumption: String(v.avg_consumption_kmpl ?? 10),
    modelYear: v.model_year != null ? String(v.model_year) : "",
    engine: v.engine ?? "",
    gearbox: v.gearbox ?? "",
    tankL: v.tank_l != null ? String(v.tank_l) : "",
    ecoRpmMin: v.eco_rpm_min != null ? String(v.eco_rpm_min) : "",
    ecoRpmMax: v.eco_rpm_max != null ? String(v.eco_rpm_max) : "",
    deviceId: v.flespi_device_id ?? "",
  };
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

function VeiculosPage() {
  const { vehicles, vehicle, setVehicleId, loading } = useActiveVehicle();
  const invalidate = useInvalidateVehicles();
  const [editing, setEditing] = useState<VehicleRecord | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (editing === "new") setForm(EMPTY);
    else if (editing) setForm(fromRecord(editing));
  }, [editing]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");
      const payload = {
        user_id: userId,
        name: form.name.trim() || "Meu carro",
        plate: form.plate.trim().toUpperCase() || "SEM-PLACA",
        current_mileage: Number(form.mileage) || 0,
        avg_consumption_kmpl: Number(form.consumption) > 0 ? Number(form.consumption) : 10,
        model_year: num(form.modelYear),
        engine: form.engine.trim() || undefined,
        gearbox: form.gearbox.trim() || undefined,
        tank_l: num(form.tankL),
        eco_rpm_min: num(form.ecoRpmMin),
        eco_rpm_max: num(form.ecoRpmMax),
        flespi_device_id: form.deviceId.trim() || null,
      };
      if (editing && editing !== "new") {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editing.id);
        if (error) throw error;
        return editing.id;
      }
      const { data, error } = await supabase
        .from("vehicles")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Veículo salvo.");
      invalidate();
      if (editing === "new" && id) setVehicleId(id);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo removido.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Meus veículos"
      subtitle="Escolha o veículo monitorado e edite a ficha técnica"
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Novo
        </Button>
      }
    >
      {loading && vehicles.length === 0 && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}

      {!loading && vehicles.length === 0 && (
        <section className="card-surface p-4 text-sm text-muted-foreground">
          Nenhum veículo cadastrado ainda. Toque em “Novo” para adicionar o primeiro.
        </section>
      )}

      <div className="space-y-3">
        {vehicles.map((v) => {
          const active = v.id === vehicle?.id;
          return (
            <section
              key={v.id}
              className={`card-surface p-4 ${active ? "border-primary/50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Car className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.plate}
                    {v.engine ? ` · ${v.engine}` : ""}
                    {v.model_year ? ` · ${v.model_year}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {Number(v.current_mileage ?? 0).toLocaleString("pt-BR")} km ·{" "}
                    {v.avg_consumption_kmpl} km/L
                    {v.tank_l ? ` · ${v.tank_l} L` : ""}
                  </p>
                </div>
                {active && (
                  <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <Check className="size-3" /> Ativo
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {!active && (
                  <Button size="sm" variant="secondary" onClick={() => setVehicleId(v.id)}>
                    Usar este
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(v)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive"
                  onClick={() => {
                    if (confirm(`Remover ${v.name}?`)) remove.mutate(v.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Novo veículo" : "Editar veículo"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" className="col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Cronos Drive 1.3"
              />
            </Field>
            <Field label="Placa">
              <Input
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                placeholder="ABC1D23"
              />
            </Field>
            <Field label="Ano">
              <Input
                inputMode="numeric"
                value={form.modelYear}
                onChange={(e) => setForm((f) => ({ ...f, modelYear: e.target.value }))}
                placeholder="2022"
              />
            </Field>
            <Field label="KM atual">
              <Input
                inputMode="decimal"
                value={form.mileage}
                onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
              />
            </Field>
            <Field label="Consumo (km/L)">
              <Input
                inputMode="decimal"
                value={form.consumption}
                onChange={(e) => setForm((f) => ({ ...f, consumption: e.target.value }))}
              />
            </Field>
            <Field label="Motor">
              <Input
                value={form.engine}
                onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value }))}
                placeholder="1.3 Firefly"
              />
            </Field>
            <Field label="Câmbio">
              <Input
                value={form.gearbox}
                onChange={(e) => setForm((f) => ({ ...f, gearbox: e.target.value }))}
                placeholder="Manual 5v"
              />
            </Field>
            <Field label="Tanque (L)">
              <Input
                inputMode="decimal"
                value={form.tankL}
                onChange={(e) => setForm((f) => ({ ...f, tankL: e.target.value }))}
                placeholder="48"
              />
            </Field>
            <Field label="RPM eco (mín/máx)">
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  value={form.ecoRpmMin}
                  onChange={(e) => setForm((f) => ({ ...f, ecoRpmMin: e.target.value }))}
                  placeholder="1500"
                />
                <Input
                  inputMode="numeric"
                  value={form.ecoRpmMax}
                  onChange={(e) => setForm((f) => ({ ...f, ecoRpmMax: e.target.value }))}
                  placeholder="2500"
                />
              </div>
            </Field>
            <Field label="ID do rastreador (Flespi)" className="col-span-2">
              <Input
                value={form.deviceId}
                onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                placeholder="opcional"
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
