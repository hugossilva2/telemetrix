import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, PlugZap, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { testAutomation } from "@/lib/automations/automations.functions";
import type { Tables } from "@/integrations/supabase/types";

type Place = Tables<"favorite_places">;
type Automation = Tables<"place_automations">;

interface Props {
  place: Place;
}

const TRIGGERS = [
  { key: "enter", label: "Ao chegar" },
  { key: "exit", label: "Ao sair" },
] as const;

export function PlaceAutomationPanel({ place }: Props) {
  const qc = useQueryClient();
  const [radius, setRadius] = useState(place.geofence_radius_m ?? 500);

  const { data: automations = [] } = useQuery({
    queryKey: ["place_automations", place.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("place_automations")
        .select("*")
        .eq("place_id", place.id);
      if (error) throw error;
      return data as Automation[];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["automation_runs", place.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_runs")
        .select("*")
        .eq("place_id", place.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const fenceMutation = useMutation({
    mutationFn: async (patch: { geofence_enabled?: boolean; geofence_radius_m?: number }) => {
      const { error } = await supabase
        .from("favorite_places")
        .update(patch)
        .eq("id", place.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite_places"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="automation" className="border-none">
        <AccordionTrigger className="px-3 py-2 text-xs font-medium text-muted-foreground hover:no-underline">
          <span className="flex items-center gap-2">
            <PlugZap className="size-3.5" />
            Cerca virtual e automação
            {place.geofence_enabled && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {place.geofence_radius_m ?? 500} m
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 px-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Cerca ativa</p>
              <p className="text-xs text-muted-foreground">
                Detecta chegada e saída do veículo neste local.
              </p>
            </div>
            <Switch
              checked={place.geofence_enabled}
              onCheckedChange={(v) => fenceMutation.mutate({ geofence_enabled: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Raio: {radius} m</Label>
            <Slider
              value={[radius]}
              min={100}
              max={2000}
              step={50}
              onValueChange={([v]) => setRadius(v)}
              onValueCommit={([v]) => fenceMutation.mutate({ geofence_radius_m: v })}
            />
          </div>

          {TRIGGERS.map((t) => (
            <AutomationForm
              key={t.key}
              placeId={place.id}
              trigger={t.key}
              label={t.label}
              automation={automations.find((a) => a.trigger === t.key) ?? null}
            />
          ))}

          {runs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Últimos disparos
              </p>
              <ul className="space-y-1">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs">
                    {r.ok ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3.5 shrink-0 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="truncate">
                      {r.trigger === "enter" ? "chegada" : "saída"}
                      {r.manual ? " (teste)" : ""} · {r.status_code ?? r.error ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function AutomationForm({
  placeId,
  trigger,
  label,
  automation,
}: {
  placeId: string;
  trigger: "enter" | "exit";
  label: string;
  automation: Automation | null;
}) {
  const qc = useQueryClient();
  const runTest = useServerFn(testAutomation);
  const [url, setUrl] = useState(automation?.url ?? "");
  const [method, setMethod] = useState(automation?.method ?? "POST");
  const [bodyJson, setBodyJson] = useState(automation?.body_json ?? "");
  const [headerName, setHeaderName] = useState(automation?.header_name ?? "");
  const [headerValue, setHeaderValue] = useState(automation?.header_value ?? "");
  const [cooldown, setCooldown] = useState(String(automation?.cooldown_seconds ?? 120));
  const [enabled, setEnabled] = useState(automation?.enabled ?? true);

  const save = useMutation({
    mutationFn: async () => {
      if (!url.trim()) throw new Error("Informe a URL do seu hub");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Faça login novamente");
      const payload = {
        user_id: uid,
        place_id: placeId,
        trigger,
        enabled,
        url: url.trim(),
        method,
        body_json: bodyJson.trim() || null,
        header_name: headerName.trim() || null,
        header_value: headerValue.trim() || null,
        cooldown_seconds: Number(cooldown) || 0,
      };
      const { error } = await supabase
        .from("place_automations")
        .upsert(payload, { onConflict: "place_id,trigger" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automação salva");
      qc.invalidateQueries({ queryKey: ["place_automations", placeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!automation) return;
      const { error } = await supabase
        .from("place_automations")
        .delete()
        .eq("id", automation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setUrl("");
      toast.success("Automação removida");
      qc.invalidateQueries({ queryKey: ["place_automations", placeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: async () => {
      if (!automation) throw new Error("Salve a automação antes de testar");
      return runTest({ data: { automationId: automation.id } });
    },
    onSuccess: (r) => {
      if (r.ok) toast.success(`Disparo OK (HTTP ${r.statusCode})`);
      else toast.error(r.error ?? "Falha no disparo");
      qc.invalidateQueries({ queryKey: ["automation_runs", placeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs" htmlFor={`url-${placeId}-${trigger}`}>
          URL do webhook
        </Label>
        <Input
          id={`url-${placeId}-${trigger}`}
          placeholder="https://meuhub.exemplo.com/api/webhook/chegada"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2">
        {(["POST", "GET"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
              method === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {method === "POST" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Corpo JSON (opcional)</Label>
          <Textarea
            rows={2}
            placeholder='{"entity_id":"light.garagem","state":"on"}'
            value={bodyJson}
            onChange={(e) => setBodyJson(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Cabeçalho</Label>
          <Input
            placeholder="Authorization"
            value={headerName}
            onChange={(e) => setHeaderName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valor</Label>
          <Input
            type="password"
            placeholder="Bearer …"
            value={headerValue}
            onChange={(e) => setHeaderValue(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Intervalo mínimo entre disparos (s)</Label>
        <Input
          inputMode="numeric"
          value={cooldown}
          onChange={(e) => setCooldown(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => test.mutate()}
          disabled={!automation || test.isPending}
        >
          <Send className="size-3.5" /> Testar
        </Button>
        {automation && (
          <Button size="sm" variant="ghost" onClick={() => remove.mutate()}>
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
