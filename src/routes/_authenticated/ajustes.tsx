import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Save, Car } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · Gestão Veicular" },
      { name: "description", content: "Configurações do veículo e alertas." },
      { property: "og:title", content: "Ajustes · Gestão Veicular" },
      { property: "og:description", content: "Configurações do veículo e alertas." },
    ],
  }),
  component: AjustesPage,
});

type VehicleRow = {
  id: string;
  name: string;
  plate: string;
  current_mileage: number;
  alert_engine_on: boolean;
  alert_low_battery: boolean;
  avg_consumption_kmpl: number;
};

function AjustesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle-primary"],
    queryFn: async (): Promise<VehicleRow | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,name,plate,current_mileage,alert_engine_on,alert_low_battery,avg_consumption_kmpl")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [consumption, setConsumption] = useState("10");
  const [alertEngine, setAlertEngine] = useState(false);
  const [alertBattery, setAlertBattery] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name);
      setPlate(vehicle.plate);
      setMileage(String(vehicle.current_mileage ?? 0));
      setConsumption(String(vehicle.avg_consumption_kmpl ?? 10));
      setAlertEngine(vehicle.alert_engine_on);
      setAlertBattery(vehicle.alert_low_battery);
    }
  }, [vehicle]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      const payload = {
        user_id: userId,
        name: name.trim() || "Meu carro",
        plate: plate.trim().toUpperCase() || "SEM-PLACA",
        current_mileage: Number(mileage) || 0,
        avg_consumption_kmpl: Number(consumption) > 0 ? Number(consumption) : 10,
        alert_engine_on: alertEngine,
        alert_low_battery: alertBattery,
      };

      if (vehicle?.id) {
        const { error } = await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", vehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ajustes salvos.");
      qc.invalidateQueries({ queryKey: ["vehicle-primary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Ajustes" subtitle="Perfil e preferências">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4"
      >
        <section className="rounded-2xl border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Car className="size-4 text-primary" />
            Perfil do veículo
          </header>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Onix 2022"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="ABC1D23"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mileage">Odômetro atual (km)</Label>
              <Input
                id="mileage"
                type="number"
                inputMode="numeric"
                min="0"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="consumption">Consumo médio (km/l)</Label>
              <Input
                id="consumption"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Usado para estimar combustível e custo por viagem.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <header className="mb-3 text-sm font-medium">Alertas</header>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">
                Alertar quando o motor for ligado
              </span>
              <Switch
                checked={alertEngine}
                onCheckedChange={setAlertEngine}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Alertar bateria baixa</span>
              <Switch
                checked={alertBattery}
                onCheckedChange={setAlertBattery}
              />
            </label>
          </div>
        </section>

        <Button
          type="submit"
          className="w-full"
          disabled={saveMutation.isPending || isLoading}
        >
          <Save className="mr-2 size-4" />
          {saveMutation.isPending ? "Salvando..." : "Salvar ajustes"}
        </Button>
      </form>

      <Button
        onClick={handleSignOut}
        variant="outline"
        className="mt-4 w-full"
      >
        <LogOut className="mr-2 size-4" />
        Sair da conta
      </Button>
    </AppShell>
  );
}
