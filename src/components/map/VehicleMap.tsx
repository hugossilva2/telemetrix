import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";

export type TrailPoint = [number, number];

function makeCarIcon(opts: { moving: boolean; ignition: boolean }) {
  const color = opts.ignition ? (opts.moving ? "#22c55e" : "#eab308") : "#6b7280";
  const shadow = opts.ignition
    ? opts.moving
      ? "rgba(34,197,94,0.35)"
      : "rgba(234,179,8,0.3)"
    : "rgba(107,114,128,0.25)";
  const pulse = opts.moving
    ? `<span style="position:absolute;inset:-8px;border-radius:50%;background:${shadow};animation:vehPulse 1.6s ease-out infinite;"></span>`
    : "";
  return L.divIcon({
    className: "vehicle-marker",
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${pulse}
        <div style="
          position:relative;width:28px;height:28px;border-radius:50%;
          background:${color};border:3px solid #0b1220;
          box-shadow:0 0 0 4px ${shadow};
          display:flex;align-items:center;justify-content:center;
          color:#0b1220;font-size:14px;font-weight:700;">🚗</div>
      </div>
      <style>@keyframes vehPulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.6);opacity:0}}</style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const startIcon = L.divIcon({
  className: "start-marker",
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#3b82f6;border:3px solid #0b1220;
    box-shadow:0 0 0 3px rgba(59,130,246,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const parkedIcon = L.divIcon({
  className: "parked-marker",
  html: `
    <div style="position:relative;width:30px;height:38px;">
      <div style="
        position:absolute;left:50%;top:0;transform:translateX(-50%);
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        transform-origin:center;rotate:-45deg;
        background:#ef4444;border:3px solid #0b1220;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
      <div style="
        position:absolute;left:50%;top:5px;transform:translateX(-50%);
        width:18px;height:18px;border-radius:50%;
        background:#0b1220;color:#fff;font-size:11px;font-weight:800;
        display:flex;align-items:center;justify-content:center;">P</div>
    </div>
  `,
  iconSize: [30, 38],
  iconAnchor: [15, 36],
});

function Recenter({ lat, lng, follow }: { lat: number; lng: number; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, follow, map]);
  return null;
}

export interface VehicleMapProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  speed?: number | null;
  ignition?: boolean | null;
  trail?: TrailPoint[];
  distanceKm?: number;
  lastUpdate?: number | null;
  status?: string;
}

export default function VehicleMap({
  lat, lng, speed, ignition, trail = [], distanceKm = 0, lastUpdate, status,
}: VehicleMapProps) {
  const hasPosition = typeof lat === "number" && typeof lng === "number";
  const center = useMemo<[number, number]>(
    () => (hasPosition ? [lat!, lng!] : [-23.5505, -46.6333]),
    [hasPosition, lat, lng],
  );
  const moving = !!ignition && typeof speed === "number" && speed > 3;
  const icon = useMemo(() => makeCarIcon({ moving, ignition: !!ignition }), [moving, ignition]);
  const start = trail[0];

  const secondsAgo = lastUpdate ? Math.max(0, Math.round((Date.now() - lastUpdate) / 1000)) : null;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
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
        {trail.length > 1 && (
          <>
            <Polyline
              positions={trail}
              pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.85, lineCap: "round" }}
            />
            <Polyline
              positions={trail}
              pathOptions={{ color: "#ffffff", weight: 1.5, opacity: 0.35, dashArray: "2 6" }}
            />
          </>
        )}
        {start && (
          <Marker position={start} icon={startIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>Ponto de partida</strong>
                <br />
                {start[0].toFixed(5)}, {start[1].toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}
        {hasPosition && (
          <>
            <Recenter lat={lat!} lng={lng!} follow />
            <CircleMarker
              center={[lat!, lng!]}
              radius={40}
              pathOptions={{ color: moving ? "#22c55e" : "transparent", weight: 1, opacity: 0.25, fillOpacity: 0 }}
            />
            <Marker position={[lat!, lng!]} icon={icon}>
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <strong>{ignition ? (moving ? "🟢 Em movimento" : "🟡 Ligado parado") : "⚫ Desligado"}</strong>
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

      {/* HUD overlay */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, zIndex: 500,
        display: "flex", gap: 8, flexWrap: "wrap", pointerEvents: "none",
      }}>
        <HudPill
          dot={ignition ? (moving ? "#22c55e" : "#eab308") : "#6b7280"}
          label={ignition ? (moving ? "Em movimento" : "Ligado parado") : "Desligado"}
          pulse={moving}
        />
        <HudPill label={typeof speed === "number" ? `${speed.toFixed(0)} km/h` : "— km/h"} />
        <HudPill label={`Rota: ${distanceKm.toFixed(2)} km`} />
        <HudPill
          dot={status === "connected" ? "#22c55e" : "#ef4444"}
          label={status === "connected" ? (secondsAgo != null ? `↻ ${secondsAgo}s` : "Ao vivo") : "Offline"}
        />
      </div>
    </div>
  );
}

function HudPill({ label, dot, pulse }: { label: string; dot?: string; pulse?: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 10px", borderRadius: 999,
      background: "rgba(11,18,32,0.85)",
      border: "1px solid rgba(148,163,184,0.25)",
      color: "#e2e8f0", fontSize: 12, fontWeight: 600,
      backdropFilter: "blur(6px)", pointerEvents: "auto",
    }}>
      {dot && (
        <span style={{
          width: 8, height: 8, borderRadius: 999, background: dot,
          boxShadow: pulse ? `0 0 0 4px ${dot}33` : undefined,
          animation: pulse ? "vehDot 1.4s ease-out infinite" : undefined,
        }} />
      )}
      <span>{label}</span>
      <style>{`@keyframes vehDot{0%{box-shadow:0 0 0 0 ${dot}66}100%{box-shadow:0 0 0 8px ${dot}00}}`}</style>
    </div>
  );
}
