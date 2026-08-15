import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { FileText, Trash2, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileAttachment } from "@/components/common/FileAttachment";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { openDocFile, uploadDocFile } from "@/lib/docs/storage";
import { formatBRL } from "@/lib/format";
import { formatDate } from "@/lib/docs/expiry";
import {
  computeStatus,
  latestByType,
  maintenanceClasses,
  MAINTENANCE_LABEL,
  MAINTENANCE_TYPES,
  type MaintenanceRecord,
  type MaintenanceType,
} from "@/lib/maintenance/rules";

export const Route = createFileRoute("/_authenticated/manutencao")({
  head: () => ({
    meta: [
      { title: "Manutenção · Telemetrix" },
      { name: "description", content: "Óleo, filtros, correia e pneus com alerta automático por quilometragem." },
      { property: "og:title", content: "Manutenção · Telemetrix" },
      { property: "og:description", content: "Alertas automáticos de manutenção por km e por tempo." },
    ],
  }),
  component: ManutencaoPage,
});

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function ManutencaoPage() {
  const qc = useQueryClient();
  const { telemetry } = useTelemetry();
  const currentMileage = telemetry.mileageKm ?? null;

  const [type, setType] = useState<MaintenanceType>("oleo");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayInput);
  const [mileage, setMileage] = useState("");
  const [intervalKm, setIntervalKm] = useState("10000");
  const [intervalMonths, setIntervalMonths] = useState("12");
  const [cost, setCost] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentMileage != null && !mileage) setMileage(currentMileage.toFixed(0));
  }, [currentMileage, mileage]);

  const onTypeChange = (v: string) => {
    const t = v as MaintenanceType;
    setType(t);
    const preset = MAINTENANCE_TYPES.find((x) => x.value === t);
    setIntervalKm(preset?.defaultKm != null ? String(preset.defaultKm) : "");
    setIntervalMonths(preset?.defaultMonths != null ? String(preset.defaultMonths) : "");
  };

  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("id,type,title,service_date,mileage_at_service,interval_km,interval_months,cost,workshop,notes,file_path")
        .order("service_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaintenanceRecord[];
    },
  });

  const upcoming = useMemo(() => {
    const items = latestByType(records).map((r) => ({
      record: r,
      info: computeStatus(r, currentMileage),
    }));
    const rank = { overdue: 0, soon: 1, ok: 2, unknown: 3 } as const;
    return items.sort((a, b) => rank[a.info.status] - rank[b.info.status]);
  }, [records, currentMileage]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const mileageNum = parseFloat(mileage);
      if (!(mileageNum >= 0)) throw new Error("Informe a quilometragem do serviço.");

      const filePath = file ? await uploadDocFile(file, "maintenance") : null;
      const km = intervalKm ? parseFloat(intervalKm) : null;
      const months = intervalMonths ? parseInt(intervalMonths, 10) : null;
      const costNum = cost ? parseFloat(cost) : null;

      const { error } = await supabase.from("maintenance_records").insert({
        user_id: uid,
        type,
        title: title.trim() || null,
        service_date: date || todayInput(),
        mileage_at_service: mileageNum,
        interval_km: km != null && Number.isFinite(km) && km > 0 ? km : null,
        interval_months: months != null && Number.isFinite(months) && months > 0 ? months : null,
        cost: costNum != null && Number.isFinite(costNum) ? costNum : null,
        workshop: workshop.trim() || null,
        notes: notes.trim() || null,
        file_path: filePath,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Manutenção registrada!");
      setTitle("");
      setCost("");
      setWorkshop("");
      setNotes("");
      setFile(null);
      setDate(todayInput());
      setMileage(currentMileage != null ? currentMileage.toFixed(0) : "");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível salvar o registro de manutenção. Verifique sua conexão e tente de novo.")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido.");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível remover o registro. Tente de novo em instantes.")),
  });

  return (
    <AppShell
      title="Manutenção"
      subtitle={
        currentMileage != null
          ? `Odômetro atual: ${Math.round(currentMileage).toLocaleString("pt-BR")} km`
          : "Aguardando telemetria do odômetro"
      }
    >
      {/* Próximas manutenções */}
      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold">Próximas manutenções</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Cadastre a última troca de cada item para acompanhar os alertas automáticos.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map(({ record, info }) => (
              <li
                key={record.id}
                className={`flex items-center gap-3 rounded-xl border p-2.5 ${maintenanceClasses[info.status]}`}
              >
                <Wrench className="size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {MAINTENANCE_LABEL[record.type] ?? record.type}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {info.nextKm != null
                      ? `Próxima em ${Math.round(info.nextKm).toLocaleString("pt-BR")} km`
                      : info.nextDate
                        ? `Próxima em ${formatDate(info.nextDate)}`
                        : "Sem intervalo definido"}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium">{info.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulário */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="mt-4 space-y-3 card-surface p-4"
      >
        <h2 className="text-sm font-semibold">Registrar serviço</h2>

        <div className="space-y-1.5">
          <Label htmlFor="mt-type">Item</Label>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger id="mt-type" className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAINTENANCE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mt-date">Data do serviço</Label>
            <Input id="mt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-mileage">Odômetro (km)</Label>
            <Input id="mt-mileage" type="number" inputMode="numeric" step="1" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} required className="h-11 text-base" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mt-ikm">Intervalo (km)</Label>
            <Input id="mt-ikm" type="number" inputMode="numeric" step="500" min="0" value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} className="h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-imonths">Intervalo (meses)</Label>
            <Input id="mt-imonths" type="number" inputMode="numeric" step="1" min="0" value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} className="h-11 text-base" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mt-cost">Custo (R$)</Label>
            <Input id="mt-cost" type="number" inputMode="decimal" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-workshop">Oficina</Label>
            <Input id="mt-workshop" value={workshop} onChange={(e) => setWorkshop(e.target.value)} maxLength={80} className="h-11 text-base" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mt-title">Descrição</Label>
          <Input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="h-11 text-base" placeholder="Ex.: Óleo 5W30 sintético" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mt-notes">Observações</Label>
          <Input id="mt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className="h-11 text-base" />
        </div>

        <FileAttachment label="Nota fiscal / ordem de serviço (opcional)" file={file} onChange={setFile} />

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Registrar manutenção"}
        </Button>
      </form>

      {/* Histórico */}
      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold">Histórico</h2>
        {isLoading ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
        ) : records.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum serviço registrado ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {records.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Wrench className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {MAINTENANCE_LABEL[r.type] ?? r.type}
                    {r.title ? ` · ${r.title}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(r.service_date)} ·{" "}
                    {Math.round(Number(r.mileage_at_service)).toLocaleString("pt-BR")} km
                    {r.workshop ? ` · ${r.workshop}` : ""}
                  </p>
                  {r.file_path && (
                    <button
                      type="button"
                      onClick={() => openDocFile(r.file_path as string).catch((e: Error) => toast.error(toUserMessage(e, "Não foi possível abrir o arquivo. Tente de novo em instantes.")))}
                      className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      <FileText className="size-3.5" /> Ver anexo
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {r.cost != null && (
                    <span className="font-mono text-sm font-semibold">{formatBRL(Number(r.cost))}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove.mutate(r.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Excluir registro"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
