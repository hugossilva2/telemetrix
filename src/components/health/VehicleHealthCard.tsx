import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useCheckups } from "@/components/checkups/CheckupButtons";
import {
  summarizeCheckups,
  vehicleHealth,
  checkupClasses,
} from "@/lib/checkups/rules";
import {
  computeStatus,
  latestByType,
  MAINTENANCE_LABEL,
  type MaintenanceRecord,
} from "@/lib/maintenance/rules";
import { expiryStatus } from "@/lib/docs/expiry";

/** Saúde do veículo: rotinas + manutenção + documentos em um só indicador. */
export function VehicleHealthCard() {
  const { telemetry } = useTelemetry();
  const currentMileage = telemetry.mileageKm ?? null;
  const { data: checkupRecords = [] } = useCheckups();

  const { data: maintenance = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select(
          "id,type,title,service_date,mileage_at_service,interval_km,interval_months,cost,workshop,notes,file_path",
        )
        .order("service_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaintenanceRecord[];
    },
  });

  const { data: docs = [] } = useQuery<{ id: string; title: string | null; type: string; expires_on: string | null }[]>({
    queryKey: ["health-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_documents")
        .select("id,title,type,expires_on");
      if (error) throw error;
      return data ?? [];
    },
  });

  const checkups = useMemo(() => summarizeCheckups(checkupRecords), [checkupRecords]);

  const maintStatus = useMemo(
    () =>
      latestByType(maintenance).map((r) => ({ record: r, info: computeStatus(r, currentMileage) })),
    [maintenance, currentMileage],
  );

  const maintenanceSoon = maintStatus.filter((m) => m.info.status === "soon").length;
  const maintenanceOverdue = maintStatus.filter((m) => m.info.status === "overdue").length;
  const expiredDocs = docs.filter((d) => expiryStatus(d.expires_on) === "expired");

  const health = vehicleHealth({
    checkups,
    maintenanceSoon,
    maintenanceOverdue,
    docsExpired: expiredDocs.length,
  });

  const pending = checkups.filter((c) => c.info.status !== "ok");

  const size = 92;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (health.score / 100) * c;

  return (
    <div className="mt-4 card-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Saúde do veículo</h2>
        </div>
        <Link
          to="/rotinas"
          className="flex items-center gap-0.5 text-xs font-medium text-primary"
        >
          Rotinas <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <svg width={size} height={size} className="-rotate-90 shrink-0" role="img" aria-label={`Saúde ${health.score} de 100`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={health.stroke}
            strokeDasharray={`${dash} ${c - dash}`}
          />
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            className={`rotate-90 fill-current text-xl font-bold tabular-nums ${health.color}`}
            style={{ transformOrigin: "center" }}
          >
            {health.score}
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
          <ul className="mt-1.5 space-y-1">
            {pending.length === 0 && maintenanceOverdue + maintenanceSoon === 0 && expiredDocs.length === 0 ? (
              <li className="text-xs text-muted-foreground">Tudo em dia. Bom uso!</li>
            ) : (
              <>
                {pending.slice(0, 3).map(({ def, info }) => (
                  <li key={def.value}>
                    <Link to="/rotinas" className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs">{def.label}</span>
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${checkupClasses[info.status]}`}
                      >
                        {info.status === "pending" ? "pendente" : "em breve"}
                      </span>
                    </Link>
                  </li>
                ))}
                {maintStatus
                  .filter((m) => m.info.status === "overdue" || m.info.status === "soon")
                  .slice(0, 2)
                  .map(({ record, info }) => (
                    <li key={record.id}>
                      <Link to="/manutencao" className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {MAINTENANCE_LABEL[record.type] ?? record.type}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                            info.status === "overdue"
                              ? "border-destructive/25 bg-destructive/10 text-destructive"
                              : "border-warning/25 bg-warning/10 text-warning"
                          }`}
                        >
                          {info.status === "overdue" ? "vencida" : "em breve"}
                        </span>
                      </Link>
                    </li>
                  ))}
                {expiredDocs.slice(0, 1).map((d) => (
                  <li key={d.id}>
                    <Link to="/documentos" className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs">{d.title ?? d.type}</span>
                      <span className="shrink-0 rounded-full border border-destructive/25 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                        vencido
                      </span>
                    </Link>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
