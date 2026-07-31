/** Chave pública VAPID — valor público, pode ficar no bundle. */
export const VAPID_PUBLIC_KEY =
  "BFdQyPzLbfV13zPAty-Dm0QE33VAE1A8mLgJqy_S2ttXORkp4S-vI7jKJAgv7QF9CL6Yw5hktHTLy4Qvdm0q6LM";

export interface PushPayload {
  title: string;
  body: string;
  /** Rota interna aberta ao clicar na notificação. */
  url?: string;
  /** Agrupa/substitui notificações do mesmo assunto. */
  tag?: string;
}
