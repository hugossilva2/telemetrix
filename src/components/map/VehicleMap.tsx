import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, CircleMarker, Circle, Polyline, useMap } from "react-leaflet";
import { MapStyleControl } from "./MapStyleControl";
import { MapButtons, ScaleControl } from "./MapControls";
import { type SpeedSample } from "./SpeedPolyline";
import { TelemetryLegend, TelemetryPolyline } from "./TelemetryPolyline";
import { PlannedRouteLayer, type PlannedRoute } from "./PlannedRouteLayer";
import { StyledTileLayers } from "./StyledTileLayers";
import { detectStops, formatStopDuration } from "@/lib/map/stops";
import { useMapStyle } from "@/lib/map/tiles";
import { makeCarIcon, maxSpeedIcon, myLocationIcon, parkedIcon, startIcon, stopIcon } from "./icons";
import { haversineKm } from "@/lib/trips/geo";

export type TrailPoint = [number, number];

function Recenter({ lat, lng, follow }: { lat: number; lng: number; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, follow, map]);
  return null;
}

function ImperativeCenter({
  bind,
}: {
  bind: (fn: (lat: number, lng: number) => void) => void;
}) {
  const map = useMap();
  useEffect(() => {
    bind((lat, lng) => map.setView([lat, lng], map.getZoom(), { animate: true }));
  }, [bind, map]);
  return null;
}

export interface VehicleMapProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  speed?: number | null;
  ignition?: boolean | null;
  trail?: SpeedSample[];
  distanceKm?: number;
  lastUpdate?: number | null;
  status?: string;
  parked?: { lat: number; lng: number; at: number } | null;
  plannedRoute?: PlannedRoute | null;
  /** Minha posição (GPS do celular). */
  me?: { lat: number; lng: number; accuracyM?: number } | null;
}

export default function VehicleMap({
  lat,
  lng,
  speed,
  ignition,
  trail = [],
  distanceKm = 0,
  lastUpdate,
  status,
  parked,
  plannedRoute,
  me,
}: VehicleMapProps) {
  const [mapStyle, setMapStyle] = useMapStyle();
  const [follow, setFollow] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const recenterRef = useRef<(lat: number, lng: number) => void>(() => {});

  const hasPosition = typeof lat === "number" && typeof lng === "number";
  const center = useMemo<[number, number]>(
    () => (hasPosition ? [lat!, lng!] : [-23.5505, -46.6333]),
    [hasPosition, lat, lng],
  );
  const moving = !!ignition && typeof speed === "number" && speed > 3;
  const icon = useMemo(() => makeCarIcon({ moving, ignition: !!ignition }), [moving, ignition]);
  const start = trail[0];

  const maxSpeedPoint = useMemo(() => {
    let best: SpeedSample | null = null;
    for (const p of trail) {
      if (typeof p.speed === "number" && (best == null || (p.speed ?? 0) > (best.speed ?? 0))) {
        best = p;
      }
    }
    return best && typeof best.speed === "number" && best.speed > 5 ? best : null;
  }, [trail]);

  const stops = useMemo(() => detectStops(trail, { minMs: 2 * 60 * 1000 }), [trail]);

  const showParked =
    !!parked &&
    (!hasPosition ||
      !!ignition ||
      Math.abs(parked.lat - (lat as number)) > 0.00005 ||
      Math.abs(parked.lng - (lng as number)) > 0.00005);

  const secondsAgo = lastUpdate ? Math.max(0, Math.round((Date.now() - lastUpdate) / 1000)) : null;

  return (
    <div ref={containerRef} style={{ position: "relative", height: "100%", width: "100%", background: "#0b1220" }}>
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
        scrollWheelZoom
      >
        <StyledTileLayers style={mapStyle} />
        <ScaleControl />
        <ImperativeCenter bind={(fn) => (recenterRef.current = fn)} />

        {plannedRoute && <PlannedRouteLayer route={plannedRoute} />}

        <TelemetryPolyline points={trail} />

        {start && (
          <Marker position={[start.lat, start.lng]} icon={startIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>Ponto de partida</strong>
                <br />
                {start.lat.toFixed(5)}, {start.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {maxSpeedPoint && (
          <Marker position={[maxSpeedPoint.lat, maxSpeedPoint.lng]} icon={maxSpeedIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>⚡ Velocidade máxima</strong>
                <br />
                {(maxSpeedPoint.speed ?? 0).toFixed(0)} km/h
                {maxSpeedPoint.t ? (
                  <>
                    <br />
                    {new Date(maxSpeedPoint.t).toLocaleTimeString("pt-BR")}
                  </>
                ) : null}
              </div>
            </Popup>
          </Marker>
        )}

        {stops.map((s, i) => (
          <Marker key={i} position={[s.lat, s.lng]} icon={stopIcon}>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>Parada</strong>
                <br />
                Duração: {formatStopDuration(s.durationMs)}
                <br />
                {new Date(s.startedAt).toLocaleTimeString("pt-BR")} →{" "}
                {new Date(s.endedAt).toLocaleTimeString("pt-BR")}
              </div>
            </Popup>
          </Marker>
        ))}

        {showParked && parked && (
          <Marker position={[parked.lat, parked.lng]} icon={parkedIcon}>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>🅿️ Último local estacionado</strong>
                <br />
                {new Date(parked.at).toLocaleString("pt-BR")}
                <br />
                {parked.lat.toFixed(5)}, {parked.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {me && (
          <>
            {me.accuracyM ? (
              <Circle
                center={[me.lat, me.lng]}
                radius={me.accuracyM}
                pathOptions={{ color: "#38bdf8", weight: 1, opacity: 0.4, fillOpacity: 0.08 }}
              />
            ) : null}
            {hasPosition && (
              <Polyline
                positions={[
                  [me.lat, me.lng],
                  [lat!, lng!],
                ]}
                pathOptions={{ color: "#38bdf8", weight: 2, opacity: 0.7, dashArray: "6 8" }}
              />
            )}
            <Marker position={[me.lat, me.lng]} icon={myLocationIcon}>
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <strong>📍 Você está aqui</strong>
                  <br />
                  {me.lat.toFixed(5)}, {me.lng.toFixed(5)}
                  {me.accuracyM ? (
                    <>
                      <br />
                      Precisão: ±{Math.round(me.accuracyM)} m
                    </>
                  ) : null}
                  {hasPosition ? (
                    <>
                      <br />
                      Distância até o carro:{" "}
                      {(() => {
                        const km = haversineKm(me.lat, me.lng, lat as number, lng as number);
                        return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
                      })()}
                    </>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {hasPosition && (
          <>
            <Recenter lat={lat!} lng={lng!} follow={follow} />
            <CircleMarker
              center={[lat!, lng!]}
              radius={40}
              pathOptions={{
                color: moving ? "#22c55e" : "transparent",
                weight: 1,
                opacity: 0.25,
                fillOpacity: 0,
              }}
            />
            <Marker position={[lat!, lng!]} icon={icon}>
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <strong>
                    {ignition ? (moving ? "🟢 Em movimento" : "🟡 Ligado parado") : "⚫ Desligado"}
                  </strong>
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
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 60,
          zIndex: 500,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          pointerEvents: "none",
        }}
      >
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

      <MapStyleControl value={mapStyle} onChange={setMapStyle} />

      <MapButtons
        containerRef={containerRef}
        follow={follow}
        onToggleFollow={() => setFollow((v) => !v)}
        onRecenter={
          hasPosition
            ? () => recenterRef.current(lat as number, lng as number)
            : undefined
        }
      />

      {trail.length > 1 && <TelemetryLegend />}
    </div>
  );
}

function HudPill({ label, dot, pulse }: { label: string; dot?: string; pulse?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(11,18,32,0.85)",
        border: "1px solid rgba(148,163,184,0.25)",
        color: "#e2e8f0",
        fontSize: 12,
        fontWeight: 600,
        backdropFilter: "blur(6px)",
        pointerEvents: "auto",
      }}
    >
      {dot && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: dot,
            boxShadow: pulse ? `0 0 0 4px ${dot}33` : undefined,
            animation: pulse ? "vehDot 1.4s ease-out infinite" : undefined,
          }}
        />
      )}
      <span>{label}</span>
      <style>{`@keyframes vehDot{0%{box-shadow:0 0 0 0 ${dot}66}100%{box-shadow:0 0 0 8px ${dot}00}}`}</style>
    </div>
  );
}
