import { detectEcoEvents, type EcoEvent, type EcoSample } from "@/lib/eco/detect";

export type FlespiMessage = {
  timestamp: number;
  "position.direction"?: number;
  "can.engine.rpm"?: number;
  "can.engine.load.level"?: number;
  "can.vehicle.speed"?: number;
  "engine.ignition.status"?: boolean;
  "vehicle.mileage"?: number;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
};

export type ReconstructedTrip = {
  startMs: number;
  endMs: number;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  distanceKm: number;
  maxSpeedKmh: number;
  mileageStart: number | null;
  mileageEnd: number | null;
  ecoEvents: EcoEvent[];
  idleSeconds: number;
};

const MIN_DISTANCE_KM = 0.2;
const MIN_DURATION_S = 60;

/** Reconstrói viagens a partir das transições de ignição do histórico Flespi. */
export function reconstructTrips(
  messages: FlespiMessage[],
  haversineKm: (a: number, b: number, c: number, d: number) => number,
): ReconstructedTrip[] {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const trips: ReconstructedTrip[] = [];
  let open:
    | (ReconstructedTrip & {
        lastLat: number | null;
        lastLng: number | null;
        samples: EcoSample[];
      })
    | null = null;

  const close = (endMs: number) => {
    if (!open) return;
    const detection = detectEcoEvents(open.samples);
    const trip: ReconstructedTrip = {
      ...open,
      endMs,
      ecoEvents: detection.events,
      idleSeconds: detection.idleSeconds,
    };
    open = null;
    const durationS = (trip.endMs - trip.startMs) / 1000;
    const mileageDelta =
      trip.mileageStart != null && trip.mileageEnd != null
        ? Math.max(0, trip.mileageEnd - trip.mileageStart)
        : 0;
    if (mileageDelta > 0) trip.distanceKm = mileageDelta;
    if (trip.distanceKm < MIN_DISTANCE_KM && durationS < MIN_DURATION_S) return;
    trips.push(trip);
  };

  for (const m of sorted) {
    const ts = m.timestamp * 1000;
    const ign = m["engine.ignition.status"];
    const lat = typeof m["position.latitude"] === "number" ? m["position.latitude"] : null;
    const lng = typeof m["position.longitude"] === "number" ? m["position.longitude"] : null;
    const mileage = typeof m["vehicle.mileage"] === "number" ? m["vehicle.mileage"] : null;
    const speed = Number(m["position.speed"]) || 0;

    if (ign === true) {
      if (!open) {
        open = {
          startMs: ts,
          endMs: ts,
          startLat: lat,
          startLng: lng,
          endLat: lat,
          endLng: lng,
          distanceKm: 0,
          maxSpeedKmh: speed,
          mileageStart: mileage,
          mileageEnd: mileage,
          lastLat: lat,
          lastLng: lng,
          ecoEvents: [],
          idleSeconds: 0,
          samples: [],
        };
        pushSample(open.samples, m, ts, speed, lat, lng);
      } else {
        if (lat != null && lng != null) {
          if (open.lastLat != null && open.lastLng != null) {
            open.distanceKm += haversineKm(open.lastLat, open.lastLng, lat, lng);
          }
          open.lastLat = lat;
          open.lastLng = lng;
          open.endLat = lat;
          open.endLng = lng;
        }
        if (mileage != null) {
          if (open.mileageStart == null) open.mileageStart = mileage;
          open.mileageEnd = mileage;
        }
        if (speed > open.maxSpeedKmh) open.maxSpeedKmh = speed;
        pushSample(open.samples, m, ts, speed, lat, lng);
        open.endMs = ts;
      }
    } else if (ign === false && open) {
      if (lat != null && lng != null) {
        open.endLat = lat;
        open.endLng = lng;
      }
      if (mileage != null) open.mileageEnd = mileage;
      close(ts);
    }
  }

  return trips;
}

function pushSample(
  samples: EcoSample[],
  m: FlespiMessage,
  ts: number,
  speed: number,
  lat: number | null,
  lng: number | null,
) {
  samples.push({
    t: ts,
    speed: Number(m["can.vehicle.speed"] ?? speed) || 0,
    heading: typeof m["position.direction"] === "number" ? m["position.direction"] : null,
    rpm: typeof m["can.engine.rpm"] === "number" ? m["can.engine.rpm"] : null,
    load: typeof m["can.engine.load.level"] === "number" ? m["can.engine.load.level"] : null,
    lat,
    lng,
  });
}
