
# Plano: PWA de Gestão Veicular (Flespi + Supabase)

Aplicação mobile-first em TanStack Start (o stack atual do projeto — equivalente a Vite + TS + Tailwind + shadcn com SSR opcional) consumindo telemetria MQTT do Flespi em tempo real, com persistência no Supabase já conectado.

Trabalho em fases incrementais. Ao final de cada fase eu paro, mostro o resultado, e só avanço com sua aprovação explícita.

## Decisões técnicas

- **Stack real:** o projeto já está em TanStack Start (não Vite puro). Vou seguir o roteamento em `src/routes/` — não vou criar `src/pages/`. shadcn/ui, Tailwind v4 e lucide-react já estão configurados.
- **MQTT:** biblioteca `mqtt` (v5) via `wss://mqtt.flespi.io:443`. O hook roda apenas no browser (guardado com `useEffect`), com reconexão exponencial automática, cleanup no unmount, e estado exposto: `{ status, lastMessage, telemetry, error }`.
- **Token Flespi:** o token que você colou no prompt é sensível. Vou pedir para salvá-lo como secret `VITE_FLESPI_TOKEN` (é usado no client, então precisa ser `VITE_*`). Não vou hard-codar no repo. O device id `8634775` fica em `VITE_FLESPI_DEVICE_ID`.
- **Supabase:** já conectado. Vou criar as tabelas `vehicles`, `fuel_logs`, `trips` via migration com RLS + GRANTs. **Autenticação:** o spec não menciona login. Vou assumir single-user / device compartilhado e usar policies `TO anon` restritas (leitura/escrita pública nas 3 tabelas). Se preferir multi-usuário com login, me diga antes da Fase 2.
- **PWA:** só manifest + ícones + theme-color (home-screen installable). Sem service worker / offline, seguindo a política do stack (offline não foi pedido).
- **Dark mode:** aplico `.dark` no `<html>` por padrão via `__root.tsx`.
- **Mapa:** `leaflet` + `react-leaflet` carregados via `React.lazy` dentro de `<ClientOnly>` (Leaflet quebra em SSR).
- **Gráfico:** `recharts` (já compatível).

## Fases

### Fase 1 — Fundação + MQTT ao vivo (Dashboard)
1. Instalar deps: `mqtt`, `leaflet`, `react-leaflet`, `@types/leaflet`, `recharts`.
2. Pedir secret `VITE_FLESPI_TOKEN` e `VITE_FLESPI_DEVICE_ID`.
3. Ativar dark mode no root + manifest PWA + ícones + meta tags.
4. Criar `src/lib/flespi/types.ts` (tipos do payload Teltonika).
5. Criar `src/hooks/useFlespiMqtt.ts` — conexão robusta, reconexão exponencial, parsing seguro do JSON, estado tipado.
6. Criar layout com bottom bar (4 abas) em `src/routes/__root.tsx` (ou layout dedicado).
7. Criar rota `/` = Dashboard com:
   - Header com status Ligado/Desligado (badge).
   - Grid de cards: Velocidade, Odômetro (formatado pt-BR), Combustível (barra de progresso), RPM, Tensão da bateria.
   - Estados de loading / desconectado.

**Entrega:** app abre, conecta no Flespi, mostra telemetria real ao vivo. Paro e peço sua validação.

### Fase 2 — Supabase (schema) + Mapa
1. Migration criando `vehicles`, `fuel_logs`, `trips` com RLS + GRANTs + triggers `updated_at`.
2. Rota `/mapa` com Leaflet lazy-loaded, marcador customizado (ícone de carro), recentralizando quando a posição MQTT muda, com throttle para não re-renderizar demais.
3. Fallback quando ainda não há posição.

**Entrega:** mapa ao vivo + tabelas criadas. Paro para aprovação.

### Fase 3 — Abastecimento
1. Rota `/abastecimento` com formulário (Preço/L, Total Pago; Litros e Custo/km calculados automaticamente).
2. Odômetro preenchido do `vehicle.mileage` MQTT (editável).
3. Insert real em `fuel_logs` (Supabase, não mock — já que temos o backend).
4. Lista dos últimos abastecimentos + gráfico Recharts de R$/km ao longo do tempo.
5. Validação com zod + react-hook-form + toasts (sonner já disponível).

**Entrega:** ciclo completo de abastecimento. Paro.

### Fase 4 — Ajustes + polimento
1. Rota `/ajustes`: formulário do perfil do veículo (nome, placa, odômetro base) persistido em `vehicles`.
2. Toggles: "Alertar motor ligado" e "Alertar bateria baixa" (persistidos em `localStorage` — não foi pedida tabela para preferências).
3. Alertas: toast quando ignição liga (se toggle ativo) e quando `battery.voltage` cai abaixo de um threshold.
4. Revisão de acessibilidade mobile (áreas de toque, contraste), meta tags por rota, e teste do fluxo completo.

**Entrega:** app finalizado. Paro para revisão final.

## Estrutura de arquivos (resumo)

```text
src/
  routes/
    __root.tsx           (dark mode, bottom bar, meta base)
    index.tsx            (Dashboard)
    mapa.tsx
    abastecimento.tsx
    ajustes.tsx
  hooks/
    useFlespiMqtt.ts
    useVehicle.ts
  lib/
    flespi/types.ts
    flespi/parse.ts
    format.ts            (pt-BR: milhar, R$, km)
  components/
    layout/BottomNav.tsx
    dashboard/*          (StatusHeader, TelemetryCard, FuelBar)
    mapa/VehicleMap.tsx  (lazy)
    abastecimento/*      (FuelForm, CostChart, FuelHistory)
    ajustes/*            (VehicleForm, AlertToggles)
supabase/migrations/...  (via migration tool na Fase 2)
public/
  manifest.webmanifest
  icons/*.png
```

## Riscos / coisas que preciso confirmar

1. **Autenticação:** confirmo single-user público (policies `TO anon`)? Se você quiser login, digo antes da Fase 2 e adiciono `_authenticated/` + tela de auth.
2. **Token Flespi no browser:** vou usá-lo via `VITE_FLESPI_TOKEN`. Qualquer visitante do app publicado poderá lê-lo do bundle — é como o Flespi funciona quando o browser fala MQTT direto. Confirma OK ou prefere proxy via server function?
3. **Ícones do PWA:** posso gerar um ícone simples (carro em círculo) ou você fornece?

Se responder "pode seguir" eu inicio a Fase 1. Se quiser mudar algo do plano, me diga que reajusto antes de codar.
