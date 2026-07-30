/**
 * Cliente ELM327 sobre Web Bluetooth (BLE).
 *
 * Só funciona em navegadores com `navigator.bluetooth` (Chrome/Edge no Android
 * e desktop), sob HTTPS e a partir de um gesto do usuário. Adaptadores BLE
 * ELM327 costumam expor um serviço serial "transparente" com uma
 * characteristic de escrita e outra de notificação — tentamos os UUIDs mais
 * comuns e, no fim, qualquer serviço que tenha esse par.
 */

// Tipos mínimos da Web Bluetooth API (não incluídos em lib.dom).
type BluetoothServiceUUID = number | string;

interface BleCharacteristicProperties {
  write: boolean;
  writeWithoutResponse: boolean;
  notify: boolean;
  indicate: boolean;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  properties: BleCharacteristicProperties;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothApi {
  requestDevice(options?: {
    acceptAllDevices?: boolean;
    optionalServices?: BluetoothServiceUUID[];
  }): Promise<BluetoothDevice>;
}

function getBluetooth(): BluetoothApi | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth ?? null;
}

const KNOWN_SERVICES: BluetoothServiceUUID[] = [
  0xfff0,
  0xffe0,
  0xffe5,
  0xfff1,
  0xfd00,
  0xfee7,
  0xff00,
  0xff10,
  0xffb0,
  0x18f0,
  0xabf0,
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ffe5-0000-1000-8000-00805f9b34fb",
  "0000fff1-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART
  "0000abf0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "00001101-0000-1000-8000-00805f9b34fb", // SPP (clássico, só p/ diagnóstico)
];

const PROMPT = ">";

export interface Elm327Events {
  onStatus?: (s: "connecting" | "connected" | "disconnected" | "error") => void;
  onError?: (message: string) => void;
  onRaw?: (line: string) => void;
  /** Passo atual do handshake, para feedback na UI. */
  onProgress?: (step: string) => void;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}


export class Elm327Client {
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private buffer = "";
  private pending: {
    resolve: (v: string) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private closed = false;

  constructor(private events: Elm327Events = {}) {}

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  get deviceId(): string | null {
    return this.device?.id ?? null;
  }


  get connected(): boolean {
    return !!this.device?.gatt?.connected && !!this.writeChar;
  }

  /** Abre o seletor nativo do navegador e conecta ao adaptador. */
  async connect(): Promise<void> {
    const bluetooth = getBluetooth();
    if (!bluetooth) {
      throw new Error("Web Bluetooth não é suportado neste navegador.");
    }
    this.closed = false;
    this.events.onStatus?.("connecting");
    this.events.onProgress?.("Escolha o adaptador na lista do navegador…");

    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_SERVICES,
    });
    this.device = device;
    device.addEventListener("gattserverdisconnected", this.handleDisconnect);

    this.events.onProgress?.(`Conectando em ${device.name ?? "adaptador"}…`);
    let server: BluetoothRemoteGATTServer | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        server = await device.gatt?.connect();
        if (server?.connected) break;
      } catch (e) {
        if (attempt === 3) {
          throw new Error(
            `Não foi possível abrir a conexão GATT (${(e as Error).message}). ` +
              "Se o adaptador estiver pareado nas configurações do Android, remova o pareamento e tente de novo.",
          );
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    }
    if (!server?.connected) {
      throw new Error("Não foi possível abrir o GATT do adaptador.");
    }

    this.events.onProgress?.("Procurando porta serial do adaptador…");
    let services: BluetoothRemoteGATTService[] = [];
    try {
      services = await server.getPrimaryServices();
    } catch (e) {
      throw new Error(
        `Não foi possível listar os serviços do adaptador (${(e as Error).message}).`,
      );
    }

    if (services.length === 0) {
      throw new Error(
        "Nenhum serviço BLE compatível foi encontrado. Este adaptador provavelmente é Bluetooth Clássico (SPP), " +
          "que o navegador não consegue acessar. Use um ELM327 BLE 4.0/5.0.",
      );
    }

    for (const service of services) {
      const chars: BluetoothRemoteGATTCharacteristic[] = await service
        .getCharacteristics()
        .catch(() => []);

      const write =
        chars.find((c) => c.properties.writeWithoutResponse) ??
        chars.find((c) => c.properties.write);
      const notify = chars.find((c) => c.properties.notify || c.properties.indicate);
      if (write && notify) {
        this.writeChar = write;
        this.notifyChar = notify;
        break;
      }
    }

    if (!this.writeChar || !this.notifyChar) {
      throw new Error(
        `Adaptador sem porta serial compatível (serviços vistos: ${services
          .map((s) => s.uuid)
          .join(", ")}). Provavelmente é um ELM327 Bluetooth Clássico, não BLE.`,
      );
    }

    await this.notifyChar.startNotifications();
    this.notifyChar.addEventListener("characteristicvaluechanged", this.handleValue);

    this.events.onProgress?.("Inicializando ELM327…");
    await this.handshake();
    this.events.onStatus?.("connected");
  }


  private handleDisconnect = () => {
    this.writeChar = null;
    this.notifyChar = null;
    if (!this.closed) this.events.onStatus?.("disconnected");
  };

  private handleValue = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    const chunk = this.decoder.decode(value);
    this.buffer += chunk;
    this.events.onRaw?.(chunk);
    if (this.buffer.includes(PROMPT) && this.pending) {
      const response = this.buffer.split(PROMPT)[0];
      this.buffer = "";
      const p = this.pending;
      this.pending = null;
      clearTimeout(p.timer);
      p.resolve(response.trim());
    }
  };

  /** Envia um comando e aguarda o prompt `>`. Serializado por fila. */
  send(command: string, timeoutMs = 4000): Promise<string> {
    const run = async () => {
      if (!this.writeChar) throw new Error("Adaptador desconectado.");
      this.buffer = "";
      const payload = this.encoder.encode(`${command}\r`);
      const result = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending = null;
          reject(new Error(`Timeout em ${command}`));
        }, timeoutMs);
        this.pending = { resolve, reject, timer };
      });
      if (this.writeChar.properties.writeWithoutResponse) {
        await this.writeChar.writeValueWithoutResponse(payload);
      } else {
        await this.writeChar.writeValue(payload);
      }
      return result;
    };

    const next = this.queue.then(run, run);
    // Mantém a fila viva mesmo em caso de erro em um comando.
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async handshake() {
    const init = ["ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATSP0"];
    let answered = 0;
    for (const cmd of init) {
      try {
        const res = await this.send(cmd, 6000);
        if (res.length > 0) answered += 1;
      } catch (e) {
        this.events.onError?.((e as Error).message);
      }
    }
    if (answered === 0) {
      throw new Error(
        "O adaptador conectou mas não respondeu aos comandos ELM327. " +
          "Confirme que ele está plugado na porta OBD-II com a ignição ligada e tente novamente.",
      );
    }
  }


  disconnect() {
    this.closed = true;
    try {
      this.notifyChar?.removeEventListener("characteristicvaluechanged", this.handleValue);
      this.device?.removeEventListener("gattserverdisconnected", this.handleDisconnect);
      this.device?.gatt?.disconnect();
    } catch {
      /* noop */
    }
    this.writeChar = null;
    this.notifyChar = null;
    this.device = null;
    this.events.onStatus?.("disconnected");
  }
}
