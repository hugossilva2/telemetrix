import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, FileText, Star, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileAttachment } from "@/components/common/FileAttachment";
import { supabase } from "@/integrations/supabase/client";
import { openDocFile, uploadDocFile } from "@/lib/docs/storage";
import { expiryClasses, expiryLabel, expiryStatus, formatDate } from "@/lib/docs/expiry";
import { DriverAvatar } from "@/components/drivers/DriverAvatar";
import { DriverRanking } from "@/components/drivers/DriverRanking";
import { DriverEditDialog } from "@/components/drivers/DriverEditDialog";
import { backfillDriverLinks } from "@/lib/drivers/api";

export const Route = createFileRoute("/_authenticated/motoristas")({
  head: () => ({
    meta: [
      { title: "Motoristas · Telemetrix" },
      { name: "description", content: "Cadastre condutores, CNH e validade da habilitação." },
      { property: "og:title", content: "Motoristas · Telemetrix" },
      { property: "og:description", content: "Cadastre condutores, CNH e validade da habilitação." },
    ],
  }),
  component: MotoristasPage,
});

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  photo_path: string | null;
  license_number: string | null;
  license_category: string | null;
  license_expires_on: string | null;
  is_default: boolean;
}

function MotoristasPage() {
  const showingProfile = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === "/_authenticated/motoristas/$id"),
  });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [category, setCategory] = useState("");
  const [expires, setExpires] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id,name,phone,photo_path,license_number,license_category,license_expires_on,is_default")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Driver[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      if (!name.trim()) throw new Error("Informe o nome do condutor.");

      const photoPath = photo ? await uploadDocFile(photo, "drivers") : null;

      const isFirst = drivers.length === 0;
      const { data: created, error } = await supabase
        .from("drivers")
        .insert({
        user_id: uid,
        name: name.trim(),
        phone: phone.trim() || null,
        photo_path: photoPath,
        license_number: license.trim() || null,
        license_category: category.trim() || null,
        license_expires_on: expires || null,
        is_default: isFirst,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Primeiro condutor assume o histórico existente (viagens e partidas sem motorista).
      if (isFirst && created?.id) await backfillDriverLinks(uid, created.id);
    },
    onSuccess: () => {
      toast.success("Motorista cadastrado!");
      setName("");
      setPhone("");
      setLicense("");
      setCategory("");
      setExpires("");
      setPhoto(null);
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["driver-ranking"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const { error: clearErr } = await supabase
        .from("drivers")
        .update({ is_default: false })
        .eq("user_id", uid);
      if (clearErr) throw clearErr;
      const { error } = await supabase.from("drivers").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Condutor padrão atualizado.");
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Motorista removido.");
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (showingProfile) return <Outlet />;

  return (
    <AppShell title="Motoristas" subtitle="Condutores e habilitação">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3 rounded-2xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="h-11 text-base" placeholder="João da Silva" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} inputMode="tel" className="h-11 text-base" placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoria CNH</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value.toUpperCase())} maxLength={5} className="h-11 text-base" placeholder="AB" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="license">Nº da CNH</Label>
            <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} maxLength={30} inputMode="numeric" className="h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expires">Validade</Label>
            <Input id="expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="h-11 text-base" />
          </div>
        </div>

        <FileAttachment label="Foto / CNH digitalizada (opcional)" file={photo} onChange={setPhoto} />

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Cadastrar motorista"}
        </Button>
      </form>

      <div className="mt-4">
        <DriverRanking />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Condutores cadastrados</h2>
        {isLoading ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
        ) : drivers.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum motorista cadastrado ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {drivers.map((d) => {
              const status = expiryStatus(d.license_expires_on);
              return (
                <li key={d.id} className="flex items-start gap-3 py-3">
                  <DriverAvatar name={d.name} photoPath={d.photo_path} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/motoristas/$id"
                      params={{ id: d.id }}
                      className="flex items-center gap-2"
                    >
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      {d.is_default && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          padrão
                        </span>
                      )}
                      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[d.license_category && `Cat. ${d.license_category}`, d.phone].filter(Boolean).join(" · ") || "Sem dados adicionais"}
                    </p>
                    {d.license_expires_on && (
                      <span
                        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${expiryClasses[status]}`}
                      >
                        CNH {formatDate(d.license_expires_on)} · {expiryLabel(d.license_expires_on)}
                      </span>
                    )}
                    {d.photo_path && (
                      <button
                        type="button"
                        onClick={() => openDocFile(d.photo_path as string).catch((e: Error) => toast.error(e.message))}
                        className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        <FileText className="size-3.5" /> Ver arquivo
                      </button>
                    )}
                    <Link
                      to="/motoristas/$id"
                      params={{ id: d.id }}
                      className="mt-1 block text-xs font-medium text-primary"
                    >
                      Ver perfil e pontuação
                    </Link>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <DriverEditDialog driver={d} />

                    {!d.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefault.mutate(d.id)}
                        className="text-muted-foreground transition-colors hover:text-primary"
                        aria-label="Definir como condutor padrão"
                      >
                        <Star className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove.mutate(d.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Excluir motorista"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
