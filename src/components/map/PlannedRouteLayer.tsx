import { Polyline, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { destinationIcon } from "./icons";

export interface PlannedRoute {
  path: Array<[number, number]>;
  distanceMeters: number;
  durationSeconds: number;
  destination: { name: string; address?: string; lat: number; lng: number };
}

/** Rota planejada: linha azul-clara pontilhada + pino do destino. */
export function PlannedRouteLayer({ route }: { route: PlannedRoute }) {
  const positions: LatLngExpression[] = route.path.map((p) => [p[0], p[1]]);
  return (
    <>
      {positions.length > 1 && (
        <>
          <Polyline
            positions={positions}
            pathOptions={{ color: "#0b1220", weight: 9, opacity: 0.45, lineCap: "round" }}
          />
          <Polyline
            positions={positions}
            pathOptions={{
              color: "#7dd3fc",
              weight: 5,
              opacity: 0.9,
              dashArray: "10 10",
              lineCap: "round",
            }}
          />
        </>
      )}
      <Marker position={[route.destination.lat, route.destination.lng]} icon={destinationIcon}>
        <Popup>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong>🏁 {route.destination.name}</strong>
            {route.destination.address ? (
              <>
                <br />
                {route.destination.address}
              </>
            ) : null}
          </div>
        </Popup>
      </Marker>
    </>
  );
}
