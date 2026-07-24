import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import { Crosshair, Maximize2, Minimize2, Navigation, NavigationOff } from "lucide-react";

/** Régua de escala do Leaflet. */
export function ScaleControl() {
  const map = useMap();
  useEffect(() => {
    // @ts-expect-error leaflet types
    const ctrl = (map as unknown as { L?: unknown }) && null;
    void ctrl;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet");
    const scale = L.control.scale({ imperial: false, position: "bottomright" });
    scale.addTo(map);
    return () => {
      scale.remove();
    };
  }, [map]);
  return null;
}

function IconButton({
  onClick,
  title,
  children,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 34,
        height: 34,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        background: active ? "rgba(34,197,94,0.18)" : "rgba(11,18,32,0.85)",
        border: "1px solid rgba(148,163,184,0.25)",
        color: active ? "#22c55e" : "#e2e8f0",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
      }}
    >
      {children}
    </button>
  );
}

export function MapButtons({
  containerRef,
  onRecenter,
  follow,
  onToggleFollow,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRecenter?: () => void;
  follow?: boolean;
  onToggleFollow?: () => void;
}) {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const handler = () => setIsFs(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "auto",
      }}
    >
      {onToggleFollow && (
        <IconButton
          onClick={onToggleFollow}
          title={follow ? "Seguindo veículo" : "Seguir veículo"}
          active={follow}
        >
          {follow ? <Navigation size={16} /> : <NavigationOff size={16} />}
        </IconButton>
      )}
      {onRecenter && (
        <IconButton onClick={onRecenter} title="Recentrar">
          <Crosshair size={16} />
        </IconButton>
      )}
      <IconButton onClick={toggleFullscreen} title={isFs ? "Sair de tela cheia" : "Tela cheia"}>
        {isFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </IconButton>
    </div>
  );
}
