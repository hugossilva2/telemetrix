import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSecret } from "@/lib/http/verifyWebhookSecret";
import { ingestFlespiMessages } from "@/lib/flespi/ingest.server";
import type { FlespiMessage } from "@/lib/flespi/ingest.server";

/**
 * Webhook do Flespi. Recebe telemetria via HTTP e detecta transições da
 * ignição no servidor, para que viagens sejam gravadas mesmo com o app
 * fechado.
 *
 * Configuração no Flespi (Telematics hub → Streams → Webhook / MQTT→HTTP):
 *   URL: https://telemetrix.lovable.app/api/public/flespi-webhook?secret=<FLESPI_WEBHOOK_SECRET>
 *   Method: POST
 *   Payload: JSON com as messages do device
 *
 * Se o stream não estiver configurado na Flespi, o coletor periódico
 * `/api/public/flespi-poll` busca as mensagens pela API REST e usa exatamente
 * a mesma lógica de ingestão.
 */

export const Route = createFileRoute("/api/public/flespi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyWebhookSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }


        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Flespi pode enviar um único objeto ou um array de mensagens.
        const messages: FlespiMessage[] = Array.isArray(body)
          ? (body as FlespiMessage[])
          : ([body] as FlespiMessage[]);

        const summary = await ingestFlespiMessages(messages);
        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
