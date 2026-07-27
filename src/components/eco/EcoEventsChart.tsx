import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { EcoEvent, EcoEventType } from "@/lib/eco/detect";
import { ECO_EVENT_LABEL } from "@/lib/eco/score";

const HEX: Record<EcoEventType, string> = {
  harsh_brake: "#ef4444",
  harsh_accel: "#f97316",
  harsh_corner: "#f59e0b",
  overspeed: "#f43f5e",
  high_rpm: "#8b5cf6",
};

type Point = {
  x: number;
  y: number;
  type: EcoEventType;
  severity: string;
  z: number;
};

function fmtClock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Perfil da viagem: cada evento posicionado no horário em que aconteceu,
 * com a velocidade no momento e a cor do tipo de evento.
 */
export function EcoEventsChart({ events }: { events: EcoEvent[] }) {
  const valid = events.filter((e) => Number.isFinite(e.t));
  if (valid.length < 2) return null;

  const byType = new Map<EcoEventType, Point[]>();
  for (const e of valid) {
    const list = byType.get(e.type) ?? [];
    list.push({
      x: e.t,
      y: Math.round(e.speedAfter ?? e.speedBefore ?? 0),
      type: e.type,
      severity: e.severity,
      z: e.severity === "severe" ? 160 : 70,
    });
    byType.set(e.type, list);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Perfil da viagem
      </p>
      <div className="mt-3 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtClock}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              type="number"
              dataKey="y"
              unit=" km/h"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              width={64}
            />
            <ZAxis type="number" dataKey="z" range={[60, 180]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(_v, _n, item) => {
                const p = item?.payload as Point | undefined;
                if (!p) return ["", ""];
                return [
                  `${p.y} km/h${p.severity === "severe" ? " · severo" : ""}`,
                  ECO_EVENT_LABEL[p.type],
                ];
              }}
              labelFormatter={(l) => fmtClock(Number(l))}
            />
            {[...byType.entries()].map(([type, data]) => (
              <Scatter key={type} data={data} fill={HEX[type]} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {[...byType.keys()].map((type) => (
          <span
            key={type}
            className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: HEX[type] }}
            />
            {ECO_EVENT_LABEL[type]}
          </span>
        ))}
      </div>
    </div>
  );
}
