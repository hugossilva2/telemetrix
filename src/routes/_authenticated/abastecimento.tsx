import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { invalidateFuelMetrics } from "@/lib/fuel/invalidate";
import { fuelMetrics } from "@/lib/fuel/metrics";
import { Camera, FileText, Paperclip, Pencil, Receipt, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/_authenticated/abastecimento")({
  head: () => ({
    meta: [
      { title: "Abastecimento · Telemetrix" },
      { name: "description", content: "Registre abastecimentos e acompanhe o custo por km." },
      { property: "og:title", content: "Abastecimento · Telemetrix" },
      {
        property: "og:description",
        content: "Registre abastecimentos e acompanhe o custo por km.",
      },
    ],
  }),
  component: AbastecimentoPage,
});

interface FuelLog {
  id: string;
  date: string;
  price_per_liter: number;
  liters_filled: number;
  total_cost: number;
  mileage_at_fill: number;
  receipt_url: string | null;
}

function toLocalDatetimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AbastecimentoPage() {
  const { telemetry } = useTelemetry();
  const qc = useQueryClient();

  const [price, setPrice] = useState("");
  const [total, setTotal] = useState("");
  const [mileage, setMileage] = useState("");
  const [datetime, setDatetime] = useState(() => toLocalDatetimeInput(new Date()));
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (telemetry.mileageKm != null && !mileage) {
      setMileage(telemetry.mileageKm.toFixed(0));
    }
  }, [telemetry.mileageKm, mileage]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const liters = useMemo(() => {
    const p = parseFloat(price);
    const t = parseFloat(total);
    return p > 0 && t > 0 ? t / p : 0;
  }, [price, total]);

  const { data: logs = [] } = useQuery<FuelLog[]>({
    queryKey: ["fuel_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("id,date,price_per_liter,liters_filled,total_cost,mileage_at_fill,receipt_url")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as FuelLog[];
    },
  });

  function resetForm() {
    setEditingId(null);
    setExistingReceipt(null);
    setPrice("");
    setTotal("");
    setPhoto(null);
    setDatetime(toLocalDatetimeInput(new Date()));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function startEdit(log: FuelLog) {
    setEditingId(log.id);
    setExistingReceipt(log.receipt_url);
    setPrice(String(Number(log.price_per_liter)));
    setTotal(String(Number(log.total_cost)));
    setMileage(String(Number(log.mileage_at_fill)));
    setDatetime(toLocalDatetimeInput(new Date(log.date)));
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada");
      const priceNum = parseFloat(price);
      const totalNum = parseFloat(total);
      const mileageNum = parseFloat(mileage);
      if (!(priceNum > 0) || !(totalNum > 0) || !(mileageNum >= 0)) {
        throw new Error("Preencha todos os campos com valores válidos.");
      }
      const isoDate = datetime ? new Date(datetime).toISOString() : new Date().toISOString();

      let receiptUrl: string | null = editingId ? existingReceipt : null;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${userData.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("fuel-receipts")
          .upload(path, photo, { contentType: photo.type || "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        receiptUrl = path;
      }

      const litersNum = totalNum / priceNum;
      const mirrored = {
        title: `Abastecimento · ${litersNum.toFixed(2)} L`,
        expense_date: isoDate.slice(0, 10),
        amount: totalNum,
        notes: `R$ ${priceNum.toFixed(2)}/L · ${mileageNum.toLocaleString("pt-BR")} km`,
      };

      if (editingId) {
        const { error } = await supabase
          .from("fuel_logs")
          .update({
            date: isoDate,
            price_per_liter: priceNum,
            liters_filled: litersNum,
            total_cost: totalNum,
            mileage_at_fill: mileageNum,
            receipt_url: receiptUrl,
          })
          .eq("id", editingId);
        if (error) throw error;

        const { error: expErr } = await supabase
          .from("expenses")
          .update(mirrored)
          .eq("fuel_log_id", editingId);
        if (expErr) throw expErr;
        return;
      }

      const { data: inserted, error } = await supabase
        .from("fuel_logs")
        .insert({
          user_id: userData.user.id,
          date: isoDate,
          price_per_liter: priceNum,
          liters_filled: litersNum,
          total_cost: totalNum,
          mileage_at_fill: mileageNum,
          receipt_url: receiptUrl,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Espelha o abastecimento em Despesas (categoria Combustível).
      const { error: expErr } = await supabase.from("expenses").insert({
        user_id: userData.user.id,
        fuel_log_id: inserted.id,
        category: "combustivel",
        paid: true,
        place: null,
        ...mirrored,
      });
      if (expErr) throw expErr;
    },
    onSuccess: () => {
      toast.success(editingId ? "Abastecimento atualizado!" : "Abastecimento salvo!");
      resetForm();
      invalidateFuelMetrics(qc);
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(
          e,
          "Não foi possível salvar o abastecimento. Verifique sua conexão e tente de novo.",
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      if (editingId === id) resetForm();
      toast.success("Abastecimento excluído.");
      invalidateFuelMetrics(qc);
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível excluir o abastecimento. Tente de novo em instantes."),
      ),
  });

  const openReceipt = useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage
        .from("fuel-receipts")
        .createSignedUrl(path, 60 * 5);
      if (error) throw error;
      return data.signedUrl;
    },
    onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível abrir o comprovante. Tente de novo em instantes."),
      ),
  });

  const metrics = useMemo(() => fuelMetrics(logs), [logs]);
  const chartData = metrics.points;


  return (
    <AppShell title="Abastecimento" subtitle="Registro e histórico">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3 card-surface p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {editingId ? "Editar abastecimento" : "Novo abastecimento"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Preço/litro (R$)</Label>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="5.89"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total">Valor total (R$)</Label>
            <Input
              id="total"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="200.00"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="datetime">Data e hora</Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            required
            className="h-11 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mileage">Odômetro atual (km)</Label>
          <Input
            id="mileage"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            required
            className="h-11 text-base"
          />
          <p className="text-xs text-muted-foreground">
            {telemetry.mileageKm != null
              ? "Auto-preenchido pelo MQTT."
              : "Aguardando telemetria — preencha manualmente."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Comprovante (opcional)</Label>
          {editingId && existingReceipt && !photo && (
            <p className="text-xs text-muted-foreground">
              Comprovante já anexado — escolha um novo arquivo para substituir.
            </p>
          )}
          {photo ? (
            <div className="relative">
              {photo.type.startsWith("image/") && photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Prévia do comprovante"
                  className="max-h-56 w-full rounded-lg object-contain bg-muted/50"
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-4 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{photo.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  if (cameraInputRef.current) cameraInputRef.current.value = "";
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
                aria-label="Remover comprovante"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor="photo-camera"
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-5 text-xs text-muted-foreground hover:bg-muted/50"
              >
                <Camera className="h-4 w-4" />
                Tirar foto
              </label>
              <label
                htmlFor="photo-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-5 text-xs text-muted-foreground hover:bg-muted/50"
              >
                <Paperclip className="h-4 w-4" />
                Galeria ou arquivo
              </label>
            </div>
          )}
          <input
            id="photo-camera"
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          <input
            id="photo-file"
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Litros abastecidos</span>
          <span className="font-mono font-medium">{liters > 0 ? liters.toFixed(2) : "—"} L</span>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending
            ? "Salvando…"
            : editingId
              ? "Salvar alterações"
              : "Salvar abastecimento"}
        </Button>
      </form>

      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold">Abastecimentos registrados</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum abastecimento registrado ainda.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {[...logs]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {new Date(log.date).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {Number(log.liters_filled).toFixed(2)} L · R${" "}
                      {Number(log.price_per_liter).toFixed(2)}/L ·{" "}
                      {Number(log.mileage_at_fill).toLocaleString("pt-BR")} km
                    </p>
                    {log.receipt_url ? (
                      <button
                        type="button"
                        onClick={() => openReceipt.mutate(log.receipt_url as string)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Ver comprovante
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-mono text-sm font-semibold">
                      R$ {Number(log.total_cost).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(log)}
                        className="text-muted-foreground transition-colors hover:text-primary"
                        aria-label="Editar abastecimento"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove.mutate(log.id)}
                        disabled={remove.isPending}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Excluir abastecimento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold">Histórico de custo (R$/km)</h2>
        {chartData.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Cadastre ao menos 2 abastecimentos para ver o gráfico.
          </p>
        ) : (
          <div className="mt-3 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`R$ ${v.toFixed(3)}/km`, "Custo"]}
                />
                <Bar dataKey="costPerKm" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppShell>
  );
}
