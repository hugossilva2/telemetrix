import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useFlespiMqtt } from "@/hooks/useFlespiMqtt";

export const Route = createFileRoute("/_authenticated/abastecimento")({
  head: () => ({
    meta: [
      { title: "Abastecimento · Gestão Veicular" },
      { name: "description", content: "Registre abastecimentos e acompanhe o custo por km." },
      { property: "og:title", content: "Abastecimento · Gestão Veicular" },
      { property: "og:description", content: "Registre abastecimentos e acompanhe o custo por km." },
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
}

function AbastecimentoPage() {
  const { telemetry } = useFlespiMqtt();
  const qc = useQueryClient();

  const [price, setPrice] = useState("");
  const [total, setTotal] = useState("");
  const [mileage, setMileage] = useState("");

  // Auto-preencher odômetro com telemetria MQTT
  useEffect(() => {
    if (telemetry.mileageKm != null && !mileage) {
      setMileage(telemetry.mileageKm.toFixed(0));
    }
  }, [telemetry.mileageKm, mileage]);

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
        .select("id,date,price_per_liter,liters_filled,total_cost,mileage_at_fill")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as FuelLog[];
    },
  });

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
      const { error } = await supabase.from("fuel_logs").insert({
        user_id: userData.user.id,
        date: new Date().toISOString(),
        price_per_liter: priceNum,
        liters_filled: totalNum / priceNum,
        total_cost: totalNum,
        mileage_at_fill: mileageNum,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Abastecimento salvo!");
      setPrice("");
      setTotal("");
      qc.invalidateQueries({ queryKey: ["fuel_logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Histórico de custo R$/km entre abastecimentos consecutivos
  const chartData = useMemo(() => {
    const rows: { label: string; costPerKm: number }[] = [];
    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1];
      const cur = logs[i];
      const dist = cur.mileage_at_fill - prev.mileage_at_fill;
      if (dist > 0) {
        rows.push({
          label: new Date(cur.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          costPerKm: +(cur.total_cost / dist).toFixed(3),
        });
      }
    }
    return rows;
  }, [logs]);

  return (
    <AppShell title="Abastecimento" subtitle="Registro e histórico">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3 rounded-2xl border border-border bg-card p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Preço/litro (R$)</Label>
            <Input id="price" type="number" step="0.01" min="0" placeholder="5.89" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total">Valor total (R$)</Label>
            <Input id="total" type="number" step="0.01" min="0" placeholder="200.00" value={total} onChange={(e) => setTotal(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mileage">Odômetro atual (km)</Label>
          <Input id="mileage" type="number" step="1" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
          <p className="text-xs text-muted-foreground">
            {telemetry.mileageKm != null ? "Auto-preenchido pelo MQTT." : "Aguardando telemetria — preencha manualmente."}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Litros abastecidos</span>
          <span className="font-mono font-medium">{liters > 0 ? liters.toFixed(2) : "—"} L</span>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar abastecimento"}
        </Button>
      </form>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
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
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
