import L from "leaflet";

export const startIcon = L.divIcon({
  className: "start-marker",
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#3b82f6;border:3px solid #0b1220;
    box-shadow:0 0 0 3px rgba(59,130,246,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const endIcon = L.divIcon({
  className: "end-marker",
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#ef4444;border:3px solid #0b1220;
    box-shadow:0 0 0 3px rgba(239,68,68,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const parkedIcon = L.divIcon({
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

export const stopIcon = L.divIcon({
  className: "stop-marker",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#64748b;border:3px solid #0b1220;
    box-shadow:0 0 0 3px rgba(100,116,139,0.35);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:10px;font-weight:800;">⏸</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export const maxSpeedIcon = L.divIcon({
  className: "max-speed-marker",
  html: `<div style="
    width:24px;height:24px;border-radius:50%;
    background:#f97316;border:3px solid #0b1220;
    box-shadow:0 0 0 3px rgba(249,115,22,0.4);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:12px;font-weight:800;">⚡</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function makeCarIcon(opts: { moving: boolean; ignition: boolean }) {
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

const ECO_EVENT_STYLE: Record<string, { color: string; glyph: string }> = {
  harsh_brake: { color: "#ef4444", glyph: "↓" },
  harsh_accel: { color: "#f97316", glyph: "↑" },
  harsh_corner: { color: "#f59e0b", glyph: "↻" },
  overspeed: { color: "#f43f5e", glyph: "!" },
  high_rpm: { color: "#8b5cf6", glyph: "R" },
};

/** Marcador de evento de direção agressiva no traçado da viagem. */
export function makeEcoEventIcon(type: string, severity?: string) {
  const s = ECO_EVENT_STYLE[type] ?? { color: "#94a3b8", glyph: "•" };
  const size = severity === "severe" ? 20 : 16;
  const ring = severity === "severe" ? 4 : 2;
  return L.divIcon({
    className: "eco-event-marker",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${s.color};border:2px solid #0b1220;
      box-shadow:0 0 0 ${ring}px ${s.color}44;
      display:flex;align-items:center;justify-content:center;
      color:#0b1220;font-size:${size - 8}px;font-weight:800;line-height:1;">${s.glyph}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const destinationIcon = L.divIcon({
  className: "destination-marker",
  html: `
    <div style="position:relative;width:30px;height:38px;">
      <div style="
        position:absolute;left:50%;top:0;transform:translateX(-50%);
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        rotate:-45deg;background:#7dd3fc;border:3px solid #0b1220;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
      <div style="
        position:absolute;left:50%;top:5px;transform:translateX(-50%);
        width:18px;height:18px;border-radius:50%;
        background:#0b1220;font-size:10px;
        display:flex;align-items:center;justify-content:center;">🏁</div>
    </div>
  `,
  iconSize: [30, 38],
  iconAnchor: [15, 36],
});
