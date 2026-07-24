## Objetivo
Resolver os 3 avisos restantes do PWABuilder mostrados no screenshot:
1. Adicionar service worker (faster & more reliable)
2. Corrigir tamanhos de ícones no manifest
3. Adicionar screenshots ao manifest

## Passos

### 1. Service Worker (offline básico)
Seguindo a skill PWA (offline explícito), instalar `vite-plugin-pwa` e configurar com `generateSW`:
- `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`
- Navegações HTML: `NetworkFirst`
- Assets hasheados same-origin: `CacheFirst`
- Excluir `/~oauth` e `/api/*` do fallback
- Criar `src/pwa/register-sw.ts` com wrapper de registro que recusa em: dev, iframe, hosts `id-preview--*`, `preview--*`, `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`, e quando `?sw=off` (nesse caso faz unregister)
- Importar o wrapper apenas em `src/start.ts` (client entry), sem afetar SSR
- Não registrar SW no editor de preview do Lovable — só funciona no domínio publicado

### 2. Ícones do manifest
Auditar `public/manifest.webmanifest`:
- Garantir entries com `sizes` exatos que batem com o arquivo real (192x192 e 512x512)
- Adicionar ícone `any` + `maskable` separados, com `type: "image/png"`
- Se PWABuilder reclamar do tamanho real do PNG, regenerar via `imagegen` com dimensões exatas

### 3. Screenshots no manifest
Capturar 2 screenshots do app rodando (via Playwright headless em `localhost:8080`, viewport mobile 390x844 e desktop 1280x800) das rotas `/` (Painel) e `/mapa`. Salvar em `public/screenshots/`. Adicionar ao manifest:
```
"screenshots": [
  { "src": "/screenshots/mobile-painel.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow", "label": "Painel em tempo real" },
  { "src": "/screenshots/desktop-mapa.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide", "label": "Mapa ao vivo" }
]
```

## Detalhes técnicos
- `vite-plugin-pwa` no `vite.config.ts` com `strategies: "generateSW"` e `filename: "sw.js"`
- Wrapper de registro chamado uma única vez após montagem do app no client
- Manifest continua com os campos já ajustados (prefer_related_applications, iarc_rating_id, scope_extensions)

## Verificação
1. Build sem erros
2. Publicar
3. Rodar "Retest" no PWABuilder — os 3 itens devem ficar verdes
4. Verificar em `?sw=off` que o SW é desregistrado
