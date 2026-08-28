import { createFileRoute, Link } from "@tanstack/react-router";
import { Save, Car, ChevronRight, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { InstallAppCard } from "@/components/settings/InstallAppCard";
import { DataSourceCard } from "@/components/settings/DataSourceCard";
import { OfflineQueueCard } from "@/components/settings/OfflineQueueCard";
import { PushNotificationsCard } from "@/components/settings/PushNotificationsCard";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · Telemetrix" },
      { name: "description", content: "Configurações do veículo e alertas." },
      { property: "og:title", content: "Ajustes · Telemetrix" },
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
  avg_consumption_kmpl: number;
  flespi_device_id: string | null;
  tracker_mode: boolean;
  alert_ignition: boolean;
  alert_motion_off: boolean;
  alert_geofence: boolean;
  alert_signal_lost: boolean;
};

function AjustesPage() {
  const qc = useQueryClient();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle-primary"],
    queryFn: async (): Promise<VehicleRow | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id,name,plate,current_mileage,alert_engine_on,avg_consumption_kmpl,flespi_device_id,tracker_mode,alert_ignition,alert_motion_off,alert_geofence,alert_signal_lost",
        )
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
  const [deviceId, setDeviceId] = useState("");
  const [alertEngine, setAlertEngine] = useState(false);
  const [trackerMode, setTrackerMode] = useState(false);
  const [alertIgnition, setAlertIgnition] = useState(true);
  const [alertMotionOff, setAlertMotionOff] = useState(true);
  const [alertGeofence, setAlertGeofence] = useState(true);
  const [alertSignalLost, setAlertSignalLost] = useState(true);

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name);
      setPlate(vehicle.plate);
      setMileage(String(vehicle.current_mileage ?? 0));
      setConsumption(String(vehicle.avg_consumption_kmpl ?? 10));
      setDeviceId(vehicle.flespi_device_id ?? "");
      setAlertEngine(vehicle.alert_engine_on);
      setTrackerMode(vehicle.tracker_mode);
      setAlertIgnition(vehicle.alert_ignition);
      setAlertMotionOff(vehicle.alert_motion_off);
      setAlertGeofence(vehicle.alert_geofence);
      setAlertSignalLost(vehicle.alert_signal_lost);
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
        flespi_device_id: deviceId.trim() || null,
        alert_engine_on: alertEngine,
        tracker_mode: trackerMode,
        alert_ignition: alertIgnition,
        alert_motion_off: alertMotionOff,
        alert_geofence: alertGeofence,
        alert_signal_lost: alertSignalLost,
      };

      if (vehicle?.id) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicle.id);
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
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível salvar os ajustes. Tente de novo em instantes."),
      ),
  });

  return (
    <AppShell title="Ajustes" subtitle="Perfil e preferências">
      <div className="mb-4 space-y-4">
        <DataSourceCard />
        <PushNotificationsCard />
        <OfflineQueueCard />
        <Link
          to="/diagnostico"
          className="flex items-center justify-between gap-3 card-surface p-4 transition-colors hover:border-primary/50"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Stethoscope className="size-4" /> Diagnóstico da conexão
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              MQTT, horário original da última mensagem, latência e motivo do sinal perdido.
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>


      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4"
      >
        <section className="card-surface p-4">
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
            <div className="space-y-1">
              <Label htmlFor="deviceId">ID do rastreador Flespi</Label>
              <Input
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Ex: 8634775"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Vincula este veículo ao dispositivo para gravar viagens no servidor mesmo com o app
                fechado.
              </p>
            </div>
          </div>
        </section>

        <section className="card-surface p-4">
          <header className="mb-3 text-sm font-medium">Alertas</header>
          <div className="space-y-3">
            <label className="flex items-start justify-between gap-3">
              <span className="text-sm">
                Modo rastreador (monitoramento 24h)
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Mantém o servidor acompanhando o veículo e avisa se o rastreador ficar sem sinal,
                  mesmo com o app fechado.
                </span>
              </span>
              <Switch checked={trackerMode} onCheckedChange={setTrackerMode} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Alertar quando o motor for ligado</span>
              <Switch checked={alertEngine} onCheckedChange={setAlertEngine} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Notificar motor ligado/desligado</span>
              <Switch checked={alertIgnition} onCheckedChange={setAlertIgnition} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Movimento com o motor desligado</span>
              <Switch checked={alertMotionOff} onCheckedChange={setAlertMotionOff} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Entrada e saída de cercas virtuais</span>
              <Switch checked={alertGeofence} onCheckedChange={setAlertGeofence} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Rastreador sem sinal</span>
              <Switch checked={alertSignalLost} onCheckedChange={setAlertSignalLost} />
            </label>
          </div>
        </section>

        <Button type="submit" className="w-full" disabled={saveMutation.isPending || isLoading}>
          <Save className="mr-2 size-4" />
          {saveMutation.isPending ? "Salvando..." : "Salvar ajustes"}
        </Button>
      </form>

      <div className="contents">
        <InstallAppCard />
      </div>

      <SignOutButton className="mt-4 w-full" />
    </AppShell>
  );
}
