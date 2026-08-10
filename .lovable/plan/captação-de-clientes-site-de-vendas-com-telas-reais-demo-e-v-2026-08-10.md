# Captação de clientes: site de vendas com telas reais, demo e vídeo

Objetivo: transformar a home atual (uma única página) em um site de vendas com páginas dedicadas, prints reais do app com dados fictícios, uma demonstração navegável sem login e um vídeo curto animado.

## Fase 1 — Modo demonstração com dados fictícios

Base de tudo: um conjunto de dados fictícios coerentes (usado nos prints, na demo e no vídeo).

- Frota fictícia: Chevrolet Onix 1.0 Turbo (principal), Honda City EX, Toyota Hilux SRV e Fiat Strada Volcano (para o caso de uso "pequena frota").
- Dados: viagens com rota em Salvador/BA, abastecimentos com preço realista, Eco Score 87, autonomia ~310 km, alertas de manutenção e documentos.
- Rota pública `/demo`: mesmas telas do app (painel, viagens, relatório, abastecer, rastreio) rodando com os dados fictícios, sem login e sem escrever no banco, com faixa "Demonstração — dados fictícios" e botão "Criar conta grátis".

Ao fim da fase: pedirei sua validação antes de seguir.

## Fase 2 — Prints reais das telas

- Capturo screenshots das 5 telas em modo demo (painel, viagens, relatório, abastecer, rastreio) em viewport de celular.
- Coloco cada print em moldura de celular e uso nas páginas de marketing e no `og:image`.

## Fase 3 — Novas páginas de marketing

- `/recursos` — tour completo: uma seção por recurso, alternando print e texto (telemetria ao vivo, autonomia e postos, viagens e custo, Eco Score, manutenção e documentos, rastreador, planejamento de rota, observadores).
- `/precos` — tabela comparativa Free / Pro / Frota, FAQ de cobrança e CTA por plano.
- `/casos-de-uso/motorista`, `/casos-de-uso/familia`, `/casos-de-uso/frota` — dor, como o Telemetrix resolve, prints relevantes e plano recomendado.
- Home reescrita: novo herói com o vídeo, prova visual das telas, blocos que levam às novas páginas.
- Cabeçalho e rodapé compartilhados com navegação entre as páginas (Recursos, Preços, Casos de uso, Entrar).

## Fase 4 — Vídeo curto animado

- Vídeo de ~10 s em motion graphics (mostradores neon acelerando, rota desenhando no mapa, cartões de viagem e autonomia entrando), no visual Neon Mint do app, sem áudio.
- Entra no herói da home em autoplay silencioso, em loop, com pôster (print do painel) e fallback de imagem.

## Fase 5 — SEO

- `head()` próprio em cada nova rota (título, descrição, og/twitter, canonical), `og:image` com os prints.
- `sitemap.xml` atualizado com as novas URLs; JSON-LD de FAQ em `/precos` e de produto/oferta na home.

## Detalhes técnicos

- Dados fictícios em `src/lib/demo/data.ts` (puro, sem rede). A demo consome esses dados por um provedor de contexto, reaproveitando os componentes de UI existentes (`GaugeCluster`, `AutonomyCard`, `TripMap`, etc.) sem alterar a lógica real do app.
- Nenhuma mudança de banco de dados e nenhuma escrita no Supabase pela rota `/demo`.
- Marketing em `src/components/marketing/` (herói, moldura de celular, seção de recurso, tabela de planos) para as páginas não duplicarem markup.
- Prints capturados via Playwright em viewport 390x844 e salvos em `src/assets/screens/`; vídeo gerado e servido do CDN de assets, referenciado por `.asset.json`.
- Apenas frontend/apresentação — a lógica de telemetria, cobrança e planos permanece intacta.
