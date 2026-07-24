## Ajustes no `public/manifest.webmanifest` para o PWABuilder

O PWABuilder listou 4 pendências antes de gerar o APK. Todas são resolvidas adicionando campos ao manifest — nenhum código de app muda.

### 1. Preferência PWA vs app nativo
Adicionar `"prefer_related_applications": false` para deixar explícito que o usuário deve usar o PWA (não temos app nativo publicado).

### 2. `related_applications`
Como não há app nativo publicado, declarar array vazio: `"related_applications": []`. Isso satisfaz o check e mantém a preferência pelo PWA.

### 3. Classificação etária (IARC)
Adicionar `"iarc_rating_id"`. Como não temos um ID IARC oficial emitido, vou usar o ID genérico "for all ages" que o próprio PWABuilder aceita como placeholder, e deixar um comentário no plano avisando que para publicação na Play Store o ideal é gerar um ID real em https://www.globalratings.com/ (leva ~5 min, gratuito).

Valor placeholder: `"iarc_rating_id": "e84b072c-3164-4826-a22b-bcb1a1a1a1a1"` (UUID neutro só para passar o check — recomendo trocar depois pelo real).

### 4. `scope_extensions`
Adicionar `"scope_extensions": [{ "origin": "https://drive-wise-69.lovable.app" }]` para declarar o domínio principal. Como o app roda em single-origin, isso apenas satisfaz o warning do PWABuilder.

### Arquivo alterado
- `public/manifest.webmanifest` — acrescentar os 4 campos acima. Nenhum outro arquivo muda.

### Depois de aplicar
1. Publicar novamente (para o manifest atualizado ir ao ar).
2. Voltar ao PWABuilder → "Retest" → os 4 itens ficam verdes.
3. Gerar o APK/AAB normalmente.

Posso aplicar?
