/**
 * Dados fictícios da demonstração pública (`/demo`) e das páginas de marketing.
 * Módulo puro: nenhuma chamada de rede, nenhuma escrita no banco.
 */

export interface DemoVehicle {
  id: string;
  name: string;
  plate: string;
  year: number;
  fuel: string;
  tankL: number;
  kmpl: number;
  odometerKm: number;
}

export const DEMO_VEHICLES: DemoVehicle[] = [
  {
    id: "onix",
    name: "Chevrolet Onix 1.0 Turbo",
    plate: "PDG-1A23",
    year: 2023,
    fuel: "Flex",
    tankL: 44,
    kmpl: 12.4,
    odometerKm: 38412,
  },
  {
    id: "city",
    name: "Honda City EX",
    plate: "QRS-4B56",
    year: 2022,
    fuel: "Flex",
    tankL: 40,
    kmpl: 13.1,
    odometerKm: 51890,
  },
  {
    id: "hilux",
    name: "Toyota Hilux SRV",
    plate: "MTB-7C89",
    year: 2021,
    fuel: "Diesel",
    tankL: 80,
    kmpl: 9.2,
    odometerKm: 96740,
  },
  {
    id: "strada",
    name: "Fiat Strada Volcano",
    plate: "NKL-2D45",
    year: 2024,
    fuel: "Flex",
    tankL: 55,
    kmpl: 11.6,
    odometerKm: 15230,
  },
];

export const DEMO_ACTIVE_VEHICLE = DEMO_VEHICLES[0];

/** Leitura instantânea do "motor" na demonstração. */
export const DEMO_LIVE = {
  ignitionOn: true,
  speedKmh: 62,
  rpm: 2140,
  fuelPct: 46,
  coolantC: 91,
  batteryV: 14.1,
  ecoScore: 87,
  autonomyKm: 251,
  kmpl: 12.8,
  ecoRpmMin: 1500,
  ecoRpmMax: 2500,
  address: "Av. Tancredo Neves, Caminho das Árvores — Salvador/BA",
  updatedAgo: "há 4 s",
} as const;

export interface DemoTrip {
  id: string;
  title: string;
  date: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  durationMin: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  liters: number;
  cost: number;
  ecoScore: number;
  harshBrakes: number;
  harshAccels: number;
}

export const DEMO_TRIPS: DemoTrip[] = [
  {
    id: "t1",
    title: "Casa → Trabalho",
    date: "Hoje",
    startedAt: "07:12",
    endedAt: "07:41",
    distanceKm: 14.8,
    durationMin: 29,
    avgSpeedKmh: 31,
    maxSpeedKmh: 68,
    liters: 1.19,
    cost: 7.24,
    ecoScore: 91,
    harshBrakes: 0,
    harshAccels: 1,
  },
  {
    id: "t2",
    title: "Trabalho → Shopping Barra",
    date: "Ontem",
    startedAt: "18:05",
    endedAt: "18:38",
    distanceKm: 11.2,
    durationMin: 33,
    avgSpeedKmh: 20,
    maxSpeedKmh: 54,
    liters: 1.02,
    cost: 6.21,
    ecoScore: 78,
    harshBrakes: 2,
    harshAccels: 3,
  },
  {
    id: "t3",
    title: "Salvador → Praia do Forte",
    date: "Sábado",
    startedAt: "08:20",
    endedAt: "09:34",
    distanceKm: 78.6,
    durationMin: 74,
    avgSpeedKmh: 64,
    maxSpeedKmh: 108,
    liters: 5.94,
    cost: 36.13,
    ecoScore: 84,
    harshBrakes: 1,
    harshAccels: 2,
  },
  {
    id: "t4",
    title: "Aeroporto → Casa",
    date: "Quinta",
    startedAt: "22:40",
    endedAt: "23:09",
    distanceKm: 24.3,
    durationMin: 29,
    avgSpeedKmh: 50,
    maxSpeedKmh: 92,
    liters: 1.95,
    cost: 11.86,
    ecoScore: 88,
    harshBrakes: 0,
    harshAccels: 0,
  },
];

export interface DemoFuelLog {
  id: string;
  date: string;
  station: string;
  liters: number;
  pricePerLiter: number;
  total: number;
  odometerKm: number;
  full: boolean;
}

export const DEMO_FUEL_LOGS: DemoFuelLog[] = [
  {
    id: "f1",
    date: "02/08",
    station: "Posto Ipiranga — Av. ACM",
    liters: 32.4,
    pricePerLiter: 6.09,
    total: 197.32,
    odometerKm: 38150,
    full: true,
  },
  {
    id: "f2",
    date: "21/07",
    station: "Shell Select — Paralela",
    liters: 30.8,
    pricePerLiter: 5.98,
    total: 184.18,
    odometerKm: 37742,
    full: true,
  },
  {
    id: "f3",
    date: "09/07",
    station: "Petrobras — Iguatemi",
    liters: 29.6,
    pricePerLiter: 6.15,
    total: 182.04,
    odometerKm: 37350,
    full: true,
  },
];

/** Resumo do relatório semanal fictício. */
export const DEMO_REPORT = {
  period: "04 a 10 de agosto",
  distanceKm: 231.4,
  trips: 12,
  hoursDriving: 6.4,
  liters: 18.2,
  cost: 110.84,
  costPerKm: 0.48,
  kmpl: 12.7,
  ecoScore: 87,
  ecoDelta: 5,
  harshBrakes: 3,
  harshAccels: 6,
  speeding: 1,
  byDay: [
    { day: "Seg", km: 29 },
    { day: "Ter", km: 34 },
    { day: "Qua", km: 26 },
    { day: "Qui", km: 41 },
    { day: "Sex", km: 38 },
    { day: "Sáb", km: 47 },
    { day: "Dom", km: 16 },
  ],
} as const;

/** Estado do rastreador na demonstração. */
export const DEMO_TRACKER = {
  status: "Em movimento",
  address: "Av. Tancredo Neves, 1632 — Salvador/BA",
  distanceFromMeKm: 3.4,
  etaMin: 9,
  lastParked: "Rua Ceará, 210 — Pituba · ontem 22:14",
  events: [
    { at: "07:12", label: "Ignição ligada", tone: "ok" as const },
    { at: "07:15", label: "Saiu da cerca virtual “Casa”", tone: "info" as const },
    { at: "07:33", label: "Excesso de velocidade: 68 km/h", tone: "warn" as const },
    { at: "07:41", label: "Chegou em “Trabalho”", tone: "ok" as const },
  ],
} as const;

export const DEMO_MAINTENANCE = [
  { label: "Troca de óleo", remainingKm: 420, dueAt: "em 420 km", tone: "warn" as const },
  { label: "Filtro de ar", remainingKm: 3100, dueAt: "em 3.100 km", tone: "ok" as const },
  { label: "Rodízio de pneus", remainingKm: 1850, dueAt: "em 1.850 km", tone: "ok" as const },
];

export const DEMO_DOCS = [
  { label: "CRLV 2026", dueAt: "vence em 18 dias", tone: "warn" as const },
  { label: "Seguro Porto", dueAt: "vence em 4 meses", tone: "ok" as const },
  { label: "CNH", dueAt: "vence em 2 anos", tone: "ok" as const },
];

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
