import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Car, Check, Copy, Link2, Trash2, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toUserMessage } from "@/lib/errors/userMessage";
import { inviteUrl, useInvites, useMySchool } from "@/lib/school/api";
import {
  useAssignments,
  useCreateInstructorInvite,
  useFleet,
  useRemoveMember,
  useSetVehicleInFleet,
  useTeam,
  useToggleAssignment,
} from "@/lib/school/teamApi";
import { SchoolSetupCard } from "@/components/school/SchoolSetupCard";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe e frota · Telemetrix" },
      { name: "description", content: "Convide instrutores, monte a frota da autoescola e defina quem dirige qual carro." },
      { property: "og:title", content: "Equipe e frota · Telemetrix" },
      { property: "og:description", content: "Instrutores, carros e vínculos da autoescola." },
    ],
  }),
  component: EquipePage,
});

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  } catch {
    toast.message(text);
  }
}

function EquipePage() {
  const { school, isLoading } = useMySchool();
  const isOwner = school?.role === "owner";
  const team = useTeam(school?.id);
  const invites = useInvites(school?.id);
  const fleet = useFleet(school?.id);
  const assignments = useAssignments(school?.id);
  const createInvite = useCreateInstructorInvite(school?.id);
  const removeMember = useRemoveMember(school?.id);
  const setInFleet = useSetVehicleInFleet(school?.id);
  const toggle = useToggleAssignment(school?.id);

  const [email, setEmail] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);

  if (!isLoading && !school) {
    return (
      <AppShell title="Equipe" subtitle="Cadastre sua autoescola para começar">
        <SchoolSetupCard />
      </AppShell>
    );
  }

  const instructors = (team.data ?? []).filter((m) => m.role === "instructor");
  const owner = (team.data ?? []).find((m) => m.role === "owner");
  const openInvites = (invites.data ?? []).filter((i) => i.role === "instructor" && !i.accepted_at);
  const instructorLimit = limitStatus(instructors.length + openInvites.length, limits.maxInstructors);
  const fleetCars = fleet.data?.fleet ?? [];
  const myCars = fleet.data?.mine ?? [];
  const has = (userId: string, vehicleId: string) =>
    (assignments.data ?? []).some((a) => a.user_id === userId && a.vehicle_id === vehicleId);

  return (
    <AppShell title="Equipe e frota" subtitle={school?.name}>
      {/* Instrutores */}
      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" /> Instrutores
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">{instructors.length + (owner ? 1 : 0)}</span>
        </h2>
        <ul className="mt-2 space-y-2">
          {owner && (
            <li className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{owner.display_name || owner.email}</p>
                <p className="text-[11px] text-muted-foreground">Responsável · também dá aulas</p>
              </div>
            </li>
          )}
          {instructors.map((m) => (
            <li key={m.user_id} className="rounded-xl border border-border/70 bg-background/35 p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.display_name || m.email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    aria-label="Remover instrutor"
                    className="grid size-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Remover este instrutor da escola? As aulas dele ficam no histórico.")) {
                        removeMember.mutate(m.user_id, {
                          onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível remover.")),
                        });
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {fleetCars.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fleetCars.map((v) => {
                    const on = has(m.user_id, v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!isOwner || toggle.isPending}
                        onClick={() => toggle.mutate({ userId: m.user_id, vehicleId: v.id, on: !on })}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                          on ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {on ? <Check className="size-3" /> : <Car className="size-3" />}
                        {v.plate}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
          {instructors.length === 0 && !team.isLoading && (
            <li className="text-xs text-muted-foreground">Nenhum instrutor ainda. Convide abaixo.</li>
          )}
        </ul>

        {isOwner && (
          <div className="mt-3">
            <LimitCounter status={instructorLimit} noun="instrutores (contando convites em aberto)" />
            <PlanLimitCard
              plan={plan}
              status={instructorLimit}
              noun="instrutores convidados"
              hint={
                instructorLimit.max === 0
                  ? "No plano Free a escola funciona só com o dono. Faça upgrade para montar a equipe."
                  : "Remova um instrutor ou faça upgrade para convidar mais."
              }
            />
          </div>
        )}

        {isOwner && !instructorLimit.atLimit && (
          <form
            className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (instructorLimit.atLimit) return;
              createInvite.mutate(
                { email },
                {
                  onSuccess: (token) => {
                    const url = inviteUrl(token);
                    setLastLink(url);
                    setEmail("");
                    void copy(url);
                  },
                  onError: (er: Error) => toast.error(toUserMessage(er, "Não foi possível criar o convite.")),
                },
              );
            }}
          >
            <Label htmlFor="inv-email" className="flex items-center gap-2 text-xs">
              <UserPlus className="size-3.5 text-primary" /> Convidar instrutor
            </Label>
            <div className="flex gap-2">
              <Input
                id="inv-email"
                type="email"
                placeholder="e-mail (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
              <Button type="submit" className="h-11 shrink-0" disabled={createInvite.isPending}>
                <Link2 className="size-4" /> Gerar link
              </Button>
            </div>
            {lastLink && (
              <button type="button" onClick={() => copy(lastLink)} className="flex w-full items-center gap-2 truncate text-left text-[11px] text-primary">
                <Copy className="size-3 shrink-0" /> {lastLink}
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">
              O instrutor abre o link, entra com a conta dele e passa a ver a agenda da escola. Se informar o e-mail, só essa conta consegue aceitar.
            </p>
            {openInvites.length > 0 && (
              <ul className="space-y-1 pt-1">
                {openInvites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-muted-foreground">{i.email ?? "link aberto"} · aguardando</span>
                    <button type="button" className="font-semibold text-primary" onClick={() => copy(inviteUrl(i.token))}>
                      copiar link
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}
      </section>

      {/* Frota */}
      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Car className="size-4 text-primary" /> Frota da escola
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">{fleetCars.length} carro{fleetCars.length === 1 ? "" : "s"}</span>
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Carros na frota aparecem para os instrutores ao agendar aulas, e as viagens deles entram nos relatórios da escola.
        </p>
        <ul className="mt-2 space-y-2">
          {[...fleetCars, ...myCars].map((v) => {
            const inFleet = v.org_id === school?.id;
            return (
              <li key={v.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{v.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{v.plate}</p>
                </div>
                {isOwner ? (
                  <Switch
                    checked={inFleet}
                    aria-label="Na frota"
                    disabled={setInFleet.isPending}
                    onCheckedChange={(on) =>
                      setInFleet.mutate(
                        { vehicleId: v.id, inFleet: on },
                        { onError: (e: Error) => toast.error(toUserMessage(e, "Não foi possível atualizar a frota.")) },
                      )
                    }
                  />
                ) : (
                  <span className="text-[11px] text-muted-foreground">{inFleet ? "na frota" : ""}</span>
                )}
              </li>
            );
          })}
          {fleetCars.length + myCars.length === 0 && !fleet.isLoading && (
            <li className="text-xs text-muted-foreground">
              Nenhum carro cadastrado.{" "}
              <Link to="/veiculos" className="font-semibold text-primary">
                Cadastrar veículo
              </Link>
            </li>
          )}
        </ul>
      </section>

      {isOwner && (
        <Link to="/escola" className="card-surface flex items-center justify-between p-4 text-sm font-semibold">
          Visão da escola: aulas por instrutor, km e custo por carro
          <span className="text-primary">Abrir</span>
        </Link>
      )}
    </AppShell>
  );
}
