import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { BarChart3, FileText, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { formatBRL } from "@/lib/format";
import { formatDate } from "@/lib/docs/expiry";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABEL,
  expenseIcon,
  monthKey,
  monthLabel,
  type ExpenseCategory,
  type ExpenseRecord,
} from "@/lib/expenses/categories";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas · Telemetrix" },
      {
        name: "description",
        content: "Pedágio, estacionamento, lavagem, multas e seguro do veículo em um só lugar.",
      },
      { property: "og:title", content: "Despesas · Telemetrix" },
      { property: "og:description", content: "Controle de custos do veículo fora do combustível." },
    ],
  }),
  component: DespesasPage,
});

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

interface DriverRow {
  id: string;
  name: string;
}

function DespesasPage() {
  const qc = useQueryClient();

  const [category, setCategory] = useState<ExpenseCategory>("pedagio");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayInput);
  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [driverId, setDriverId] = useState<string>("none");
  const [paid, setPaid] = useState(true);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingFilePath, setExistingFilePath] = useState<string | null>(null);

  const { data: drivers = [] } = useQuery<DriverRow[]>({
    queryKey: ["drivers", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as DriverRow[];
    },
  });

  const { data: expenses = [], isLoading } = useQuery<ExpenseRecord[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id,category,title,expense_date,amount,due_date,paid,place,notes,file_path,driver_id,fuel_log_id",
        )
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpenseRecord[];
    },
  });

  const thisMonth = monthKey(new Date());
  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => monthKey(e.expense_date) === thisMonth)
        .reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses, thisMonth],
  );
  const pending = useMemo(() => expenses.filter((e) => !e.paid), [expenses]);

  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRecord[]>();
    for (const e of expenses) {
      const k = monthKey(e.expense_date);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? null;

  function resetForm() {
    setEditingId(null);
    setExistingFilePath(null);
    setCategory("pedagio");
    setTitle("");
    setAmount("");
    setPlace("");
    setDueDate("");
    setDriverId("none");
    setNotes("");
    setFile(null);
    setPaid(true);
    setDate(todayInput());
  }

  function startEdit(e: ExpenseRecord) {
    setEditingId(e.id);
    setExistingFilePath(e.file_path);
    setCategory(e.category);
    setTitle(e.title ?? "");
    setDate(e.expense_date.slice(0, 10));
    setAmount(String(Number(e.amount)));
    setPlace(e.place ?? "");
    setDueDate(e.due_date ?? "");
    setDriverId(e.driver_id ?? "none");
    setPaid(e.paid);
    setNotes(e.notes ?? "");
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const value = parseFloat(amount.replace(",", "."));
      if (!(value > 0)) throw new Error("Informe um valor maior que zero.");

      const filePath = file
        ? await uploadDocFile(file, "expenses")
        : editingId
          ? existingFilePath
          : null;

      const payload = {
        category,
        title: title.trim() || null,
        expense_date: date || todayInput(),
        amount: value,
        due_date: dueDate || null,
        paid,
        place: place.trim() || null,
        notes: notes.trim() || null,
        file_path: filePath,
        driver_id: driverId === "none" ? null : driverId,
      };

      if (editingId) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", editingId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("expenses").insert({ user_id: uid, ...payload });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingId ? "Despesa atualizada!" : "Despesa registrada!");
      resetForm();
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(
          e,
          "Não foi possível salvar a despesa. Verifique sua conexão e tente de novo.",
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa removida.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível remover a despesa. Tente de novo em instantes."),
      ),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("expenses").update({ paid: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
    onError: (e: Error) =>
      toast.error(
        toUserMessage(e, "Não foi possível atualizar a despesa. Tente de novo em instantes."),
      ),
  });

  return (
    <AppShell title="Despesas" subtitle="Pedágio, estacionamento, multas e mais">
      <div className="grid grid-cols-2 gap-3">
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Total do mês</p>
          <p className="mt-1 font-mono text-xl font-semibold">{formatBRL(monthTotal)}</p>
          <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
            {monthLabel(thisMonth)}
          </p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="mt-1 font-mono text-xl font-semibold text-destructive">
            {formatBRL(pending.reduce((s, e) => s + Number(e.amount || 0), 0))}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {pending.length} {pending.length === 1 ? "pendência" : "pendências"}
          </p>
        </div>
      </div>

      <Link
        to="/relatorio"
        className="mt-3 flex items-center gap-3 card-surface p-3 transition-colors hover:bg-accent"
      >
        <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <BarChart3 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Relatório mensal</p>
          <p className="truncate text-xs text-muted-foreground">
            Combustível + manutenção + despesas, custo por km e exportação CSV
          </p>
        </div>
      </Link>

      {/* Formulário */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="mt-4 space-y-3 card-surface p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{editingId ? "Editar despesa" : "Nova despesa"}</h2>
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

        <div className="space-y-1.5">
          <Label htmlFor="ex-cat">Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
            <SelectTrigger id="ex-cat" className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ex-date">Data</Label>
            <Input
              id="ex-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-amount">Valor (R$)</Label>
            <Input
              id="ex-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-title">Descrição</Label>
          <Input
            id="ex-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Ex.: Pedágio Rod. Anhanguera"
            className="h-11 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-place">Local</Label>
          <Input
            id="ex-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            maxLength={80}
            className="h-11 text-base"
          />
        </div>

        {category === "multa" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ex-due">Vencimento</Label>
              <Input
                id="ex-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-driver">Condutor responsável</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger id="ex-driver" className="h-11 text-base">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informar</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">Já paga</p>
            <p className="text-xs text-muted-foreground">
              Desmarque para acompanhar como pendência
            </p>
          </div>
          <Switch checked={paid} onCheckedChange={setPaid} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-notes">Observações</Label>
          <Input
            id="ex-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            className="h-11 text-base"
          />
        </div>

        <FileAttachment label="Comprovante (opcional)" file={file} onChange={setFile} />
        {editingId && existingFilePath && !file && (
          <p className="text-xs text-muted-foreground">
            Comprovante já anexado — escolha um novo arquivo para substituir.
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar despesa"}
        </Button>
      </form>

      {/* Histórico */}
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : expenses.length === 0 ? (
          <div className="card-surface p-4">
            <p className="text-xs text-muted-foreground">Nenhuma despesa registrada ainda.</p>
          </div>
        ) : (
          groups.map(([key, items]) => (
            <div key={key} className="card-surface p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold capitalize">{monthLabel(key)}</h2>
                <span className="font-mono text-sm font-semibold">
                  {formatBRL(items.reduce((s, e) => s + Number(e.amount || 0), 0))}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-border">
                {items.map((e) => {
                  const Icon = expenseIcon(e.category);
                  return (
                    <li key={e.id} className="flex items-start gap-3 py-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {EXPENSE_LABEL[e.category]}
                          {e.title ? ` · ${e.title}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {formatDate(e.expense_date)}
                          {e.place ? ` · ${e.place}` : ""}
                          {driverName(e.driver_id) ? ` · ${driverName(e.driver_id)}` : ""}
                        </p>
                        {!e.paid && (
                          <button
                            type="button"
                            onClick={() => togglePaid.mutate({ id: e.id, value: true })}
                            className="mt-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                          >
                            Em aberto{e.due_date ? ` · vence ${formatDate(e.due_date)}` : ""} —
                            marcar como paga
                          </button>
                        )}
                        {e.file_path && (
                          <button
                            type="button"
                            onClick={() =>
                              openDocFile(e.file_path as string).catch((err: Error) =>
                                toast.error(
                                  toUserMessage(
                                    err,
                                    "Não foi possível abrir o comprovante. Tente de novo em instantes.",
                                  ),
                                ),
                              )
                            }
                            className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
                          >
                            <FileText className="size-3.5" /> Ver comprovante
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {formatBRL(Number(e.amount))}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(e)}
                            className="text-muted-foreground transition-colors hover:text-primary"
                            aria-label="Editar despesa"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove.mutate(e.id)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="Excluir despesa"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
