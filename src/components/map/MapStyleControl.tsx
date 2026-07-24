import { MAP_STYLES, type MapStyleId } from "@/lib/map/tiles";
import { Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function MapStyleControl({
  value,
  onChange,
}: {
  value: MapStyleId;
  onChange: (v: MapStyleId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 500,
        pointerEvents: "auto",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Estilo do mapa"
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
          cursor: "pointer",
        }}
      >
        <Layers size={14} />
        <span>{MAP_STYLES[value].label}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            minWidth: 132,
            padding: 4,
            borderRadius: 12,
            background: "rgba(11,18,32,0.95)",
            border: "1px solid rgba(148,163,184,0.25)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {(Object.keys(MAP_STYLES) as MapStyleId[]).map((id) => {
            const active = id === value;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: active ? "rgba(34,197,94,0.18)" : "transparent",
                  color: active ? "#22c55e" : "#e2e8f0",
                  border: "none",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {MAP_STYLES[id].label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
