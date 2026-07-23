// Flespi MQTT credentials. The token is used to authenticate a browser MQTT
// client, so it is inherently client-visible (any user of the published app
// can read it from the bundle). Rotate via Flespi if compromised.
export const FLESPI_CONFIG = {
  brokerUrl: "wss://mqtt.flespi.io:443",
  token: "eBxqUHJInEavElozzzLBtLEl7gWT3LztGZMHK1tcYYQK1h4z0wCl8JWpXT3tXk0o",
  deviceId: "8634775",
} as const;

export const FLESPI_TOPIC = `flespi/message/gw/devices/${FLESPI_CONFIG.deviceId}/+`;
