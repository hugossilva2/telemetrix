import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Ícone customizado (círculo azul com pino) via divIcon para não depender de assets externos.
const carIcon = L.divIcon({
  className: "vehicle-marker",
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#22c55e;border:3px solid #052e16;
    box-shadow:0 0 0 4px rgba(34,197,94,0.25);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export interface VehicleMapProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  speed?: number | null;
  ignition?: boolean | null;
}

export default function VehicleMap({ lat, lng, speed, ignition }: VehicleMapProps) {
  const hasPosition = typeof lat === "number" && typeof lng === "number";
  const center = useMemo<[number, number]>(
    () => (hasPosition ? [lat!, lng!] : [-23.5505, -46.6333]),
    [hasPosition, lat, lng],
  );

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: "100%", width: "100%", background: "#0b1220" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasPosition && (
        <>
          <Recenter lat={lat!} lng={lng!} />
          <Marker position={[lat!, lng!]} icon={carIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>{ignition ? "🟢 Ligado" : "⚫ Desligado"}</strong>
                <br />
                {typeof speed === "number" ? `${speed.toFixed(0)} km/h` : "—"}
                <br />
                {lat!.toFixed(5)}, {lng!.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
