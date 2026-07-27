import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil, expiryClasses, expiryLabel, expiryStatus, SOON_DAYS } from "@/lib/docs/expiry";

interface AlertItem {
  key: string;
  label: string;
  expires_on: string;
  to: "/documentos" | "/motoristas";
}

const DOC_LABEL: Record<string, string> = {
  crlv: "CRLV",
  seguro: "Seguro",
  ipva: "IPVA",
  licenciamento: "Licenciamento",
  inspecao: "Inspeção",
  outro: "Documento",
};

/**
 * Lista documentos e CNHs vencidos ou a vencer nos próximos 30 dias.
 */
export function ExpiringDocsCard() {
  const { data: items = [] } = useQuery<AlertItem[]>({
    queryKey: ["docs-alerts"],
    queryFn: async () => {
      const [docsRes, driversRes] = await Promise.all([
        supabase
          .from("vehicle_documents")
          .select("id,type,title,expires_on")
          .not("expires_on", "is", null),
        supabase
          .from("drivers")
          .select("id,name,license_expires_on")
          .not("license_expires_on", "is", null),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (driversRes.error) throw driversRes.error;

      const list: AlertItem[] = [];
      for (const d of docsRes.data ?? []) {
        if (!d.expires_on) continue;
        list.push({
          key: `doc-${d.id}`,
          label: d.title ? `${DOC_LABEL[d.type] ?? d.type} · ${d.title}` : (DOC_LABEL[d.type] ?? d.type),
          expires_on: d.expires_on,
          to: "/documentos",
        });
      }
      for (const d of driversRes.data ?? []) {
        if (!d.license_expires_on) continue;
        list.push({
          key: `cnh-${d.id}`,
          label: `CNH · ${d.name}`,
          expires_on: d.license_expires_on,
          to: "/motoristas",
        });
      }

      return list
        .filter((i) => {
          const days = daysUntil(i.expires_on);
          return days !== null && days <= SOON_DAYS;
        })
        .sort((a, b) => (daysUntil(a.expires_on) ?? 0) - (daysUntil(b.expires_on) ?? 0));
    },
  });

  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Vencimentos próximos</h2>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.slice(0, 5).map((i) => {
          const status = expiryStatus(i.expires_on);
          return (
            <li key={i.key}>
              <Link
                to={i.to}
                className="flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-accent/50"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{i.label}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${expiryClasses[status]}`}>
                  {expiryLabel(i.expires_on)}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
