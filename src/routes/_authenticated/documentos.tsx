import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { FileText, ShieldCheck, Trash2 } from "lucide-react";
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
import { openDocFile, uploadDocFile } from "@/lib/docs/storage";
import { expiryClasses, expiryLabel, expiryStatus, formatDate, daysUntil } from "@/lib/docs/expiry";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos · Telemetrix" },
      {
        name: "description",
        content: "CRLV, seguro, IPVA e licenciamento com alerta de vencimento.",
      },
      { property: "og:title", content: "Documentos · Telemetrix" },
      {
        property: "og:description",
        content: "CRLV, seguro, IPVA e licenciamento com alerta de vencimento.",
      },
    ],
  }),
  component: DocumentosPage,
});

const DOC_TYPES = [
  { value: "crlv", label: "CRLV" },
  { value: "seguro", label: "Seguro" },
  { value: "ipva", label: "IPVA" },
  { value: "licenciamento", label: "Licenciamento" },
  { value: "inspecao", label: "Inspeção" },
  { value: "outro", label: "Outro" },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

interface DocRow {
  id: string;
  type: DocType;
  title: string | null;
  number: string | null;
  issuer: string | null;
  amount: number | null;
  expires_on: string | null;
  notes: string | null;
  file_path: string | null;
}

function DocumentosPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<DocType>("crlv");
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [issuer, setIssuer] = useState("");
  const [amount, setAmount] = useState("");
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: docs = [], isLoading } = useQuery<DocRow[]>({
    queryKey: ["vehicle_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_documents")
        .select("id,type,title,number,issuer,amount,expires_on,notes,file_path")
        .order("expires_on", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const sorted = useMemo(() => {
    return [...docs].sort((a, b) => {
      const da = daysUntil(a.expires_on);
      const db = daysUntil(b.expires_on);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [docs]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");

      const filePath = file ? await uploadDocFile(file, "documents") : null;
      const amountNum = amount ? parseFloat(amount) : null;

      const { error } = await supabase.from("vehicle_documents").insert({
        user_id: uid,
        type,
        title: title.trim() || null,
        number: number.trim() || null,
        issuer: issuer.trim() || null,
        amount: amountNum != null && Number.isFinite(amountNum) ? amountNum : null,
        expires_on: expires || null,
        notes: notes.trim() || null,
        file_path: filePath,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento salvo!");
      setTitle("");
      setNumber("");
      setIssuer("");
      setAmount("");
      setExpires("");
      setNotes("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["vehicle_documents"] });
      qc.invalidateQueries({ queryKey: ["docs-alerts"] });
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(
          e,
          "Não foi possível salvar o documento. Verifique sua conexão e tente de novo.",
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento removido.");
      qc.invalidateQueries({ queryKey: ["vehicle_documents"] });
      qc.invalidateQueries({ queryKey: ["docs-alerts"] });
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível remover o documento. Tente de novo em instantes."),
      ),
  });

  return (
    <AppShell title="Documentos" subtitle="CRLV, seguro, IPVA e mais">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3 card-surface p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as DocType)}>
              <SelectTrigger id="doc-type" className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-expires">Vencimento</Label>
            <Input
              id="doc-expires"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-title">Descrição</Label>
          <Input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="h-11 text-base"
            placeholder="Ex.: Seguro 2026 — Porto"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-number">Número / apólice</Label>
            <Input
              id="doc-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              maxLength={60}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-amount">Valor (R$)</Label>
            <Input
              id="doc-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-issuer">Órgão / seguradora</Label>
          <Input
            id="doc-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            maxLength={80}
            className="h-11 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-notes">Observações</Label>
          <Input
            id="doc-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            className="h-11 text-base"
          />
        </div>

        <FileAttachment label="Arquivo do documento (opcional)" file={file} onChange={setFile} />

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar documento"}
        </Button>
      </form>

      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold">Documentos cadastrados</h2>
        {isLoading ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
        ) : sorted.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum documento cadastrado ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sorted.map((d) => {
              const status = expiryStatus(d.expires_on);
              const typeLabel = DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type;
              return (
                <li key={d.id} className="flex items-start gap-3 py-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-chart-3/10 text-chart-3">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {typeLabel}
                      {d.title ? ` · ${d.title}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[d.number, d.issuer, d.amount != null ? formatBRL(Number(d.amount)) : null]
                        .filter(Boolean)
                        .join(" · ") || "Sem dados adicionais"}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${expiryClasses[status]}`}
                    >
                      {d.expires_on
                        ? `${formatDate(d.expires_on)} · ${expiryLabel(d.expires_on)}`
                        : "Sem vencimento"}
                    </span>
                    {d.file_path && (
                      <button
                        type="button"
                        onClick={() =>
                          openDocFile(d.file_path as string).catch((e: Error) =>
                            toast.error(
                              toUserMessage(
                                e,
                                "Não foi possível abrir o arquivo. Tente de novo em instantes.",
                              ),
                            ),
                          )
                        }
                        className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        <FileText className="size-3.5" /> Ver arquivo
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(d.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Excluir documento"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
