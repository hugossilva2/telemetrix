import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";
import {
  computeStatus,
  latestByType,
  maintenanceClasses,
  MAINTENANCE_LABEL,
  type MaintenanceRecord,
} from "@/lib/maintenance/rules";

const NOTIFIED_KEY = "maintenanceNotified:v1";

function alreadyNotifiedToday(key: string) {
  if (typeof window === "undefined") return true;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (map[key] === today) return true;
    map[key] = today;
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
    return false;
  } catch {
    return true;
  }
}

/**
 * Mostra itens de manutenção vencidos ou próximos do vencimento,
 * calculados a partir do odômetro em tempo real.
 */
export function MaintenanceAlertsCard() {
  const { telemetry } = useTelemetry();
  const currentMileage = telemetry.mileageKm ?? null;

  const { data: records = [] } = useQuery<MaintenanceRecord[]>({
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

  const alerts = useMemo(() => {
    return latestByType(records)
      .map((r) => ({ record: r, info: computeStatus(r, currentMileage) }))
      .filter((x) => x.info.status === "soon" || x.info.status === "overdue")
      .sort((a, b) => (a.info.status === "overdue" ? -1 : 1) - (b.info.status === "overdue" ? -1 : 1));
  }, [records, currentMileage]);

  useEffect(() => {
    for (const a of alerts) {
      const key = `${a.record.id}:${a.info.status}`;
      if (alreadyNotifiedToday(key)) continue;
      const label = MAINTENANCE_LABEL[a.record.type] ?? a.record.type;
      if (a.info.status === "overdue") {
        toast.error(`${label} vencida`, { description: a.info.message });
      } else {
        toast.warning(`${label} se aproximando`, { description: a.info.message });
      }
    }
  }, [alerts]);

  if (alerts.length === 0) return null;

  const hasOverdue = alerts.some((a) => a.info.status === "overdue");

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 ${
        hasOverdue ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <Wrench className={`size-4 ${hasOverdue ? "text-destructive" : "text-warning"}`} />
        <h2 className="text-sm font-semibold">Manutenção</h2>
      </div>
      <ul className="mt-2 space-y-1.5">
        {alerts.slice(0, 4).map(({ record, info }) => (
          <li key={record.id}>
            <Link
              to="/manutencao"
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-accent/50"
            >
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {MAINTENANCE_LABEL[record.type] ?? record.type}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${maintenanceClasses[info.status]}`}
              >
                {info.message}
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
