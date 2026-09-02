import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/userMessage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect:
      typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//")
        ? s.redirect
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar · Gestão Veicular" },
      { name: "description", content: "Acesse sua conta para gerenciar o veículo." },
      { property: "og:title", content: "Entrar · Gestão Veicular" },
      { property: "og:description", content: "Acesse sua conta para gerenciar o veículo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const go = (fallback: "/inicio" | "/perfil-de-uso") =>
    redirect ? navigate({ href: redirect, replace: true }) : navigate({ to: fallback, replace: true });
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) go("/inicio");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, redirect]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(
        toUserMessage(error, "Não foi possível entrar. Confira os dados e tente de novo."),
      );
      return;
    }
    toast.success("Bem-vindo!");
    go("/inicio");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(toUserMessage(error, "Não foi possível criar a conta. Tente de novo."));
      return;
    }
    if (data.session) {
      toast.success("Conta criada!");
      go("/perfil-de-uso");
    } else {
      toast.success("Confira seu email para confirmar a conta.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Car className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Gestão Veicular</h1>
          <p className="text-sm text-muted-foreground">Entre para acompanhar seu veículo</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="mt-4 space-y-3 card-surface p-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signin-password">Senha</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-4 space-y-3 card-surface p-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Senha</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Criando…" : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
