## Objetivo
1. Gerar novo ícone conceito "Pulso do Veículo" (silhueta minimalista de carro de perfil com o assoalho virando um gráfico de ECG/linha de performance, fundo dark, brilho verde neon/ciano).
2. Renomear o app de "DriveWise" para **Telemetrix**.

## Passos

### 1. Ícone
- Gerar via `imagegen` (premium, quadrado, fundo dark #0b1220) em 1024×1024 salvando em `src/assets/telemetrix-icon.png`.
- Redimensionar cópias para `public/icons/icon-192.png` (192×192), `public/icons/icon-512.png` (512×512), `public/icons/apple-touch-icon.png` (180×180) e `public/favicon.ico`.
- Prompt: silhueta de carro de perfil minimalista, linha do assoalho continua como traço de eletrocardiograma/linha de performance, glow verde-neon/ciano, fundo escuro sólido, estilo flat/tech, sem texto.

### 2. Renome para Telemetrix
Substituir "DriveWise" por "Telemetrix" em:
- `public/manifest.webmanifest` (`name`, `short_name`, `description`)
- `src/routes/__root.tsx` (title, description, og:*)
- Textos visíveis: `src/components/layout/BottomNav.tsx`, headers das rotas (Painel, Ajustes, InstallAppCard) e quaisquer strings "DriveWise" encontradas via `rg`.
- README se existir.

Nota: manter o slug publicado atual (`drive-wise-69.lovable.app`); renomear a URL é opcional e só se o usuário pedir depois.

### 3. Verificação
- Build sem erros.
- `curl` no `/manifest.webmanifest` mostra "Telemetrix".
- Screenshot rápido do Painel confirmando o novo nome.
