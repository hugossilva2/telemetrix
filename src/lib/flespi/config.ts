// Flespi MQTT credentials. The token is used to authenticate a browser MQTT
// client, so it is inherently client-visible (any user of the published app
// can read it from the bundle). Rotate via Flespi if compromised.
export const FLESPI_CONFIG = {
  brokerUrl: "wss://mqtt.flespi.io:443",
  token: "xwJvtyMl5HwITMJpUIY0xMGkSXiRKrDtDqz9rS7bCZtSnqoFaaIOnXihUQJ02Mpp",
  deviceId: "8634775",
} as const;

// `#` = casa o tópico do device e qualquer subtópico. Alguns fluxos do Flespi
// publicam em `flespi/message/gw/devices/{id}` (sem segmento extra) e outros
// em `.../{id}/xxx`; o `#` cobre ambos os casos.
export const FLESPI_TOPIC = `flespi/message/gw/devices/${FLESPI_CONFIG.deviceId}/#`;
