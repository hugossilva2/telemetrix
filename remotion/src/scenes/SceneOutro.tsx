import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

/** Cena 5 — fechamento com a marca e a promessa do produto. */
export const SceneOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({ frame, fps, config: { damping: 15, stiffness: 130 } });
  const line = interpolate(frame, [14, 40], [0, 1], { extrapolateRight: "clamp" });
  const tail = interpolate(frame, [30, 54], [0, 1], { extrapolateRight: "clamp" });
  const drift = Math.sin(frame / 26) * 6;

  return (
    <AbsoluteFill
      style={{ fontFamily: body, alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: 44,
          display: "grid",
          placeItems: "center",
          background: `linear-gradient(135deg, ${C.primary}, ${C.glow})`,
          boxShadow: `0 0 70px -10px ${C.primary}aa`,
          opacity: logo,
          transform: `scale(${0.8 + logo * 0.2}) translateY(${drift}px)`,
        }}
      >
        <svg width={92} height={92} viewBox="0 0 92 92">
          <path
            d="M10 52 h16 l10 -22 l10 40 l10 -30 l8 12 h18"
            fill="none"
            stroke={C.bgDeep}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 104,
          margin: "44px 0 0",
          color: C.fg,
          letterSpacing: -3,
          opacity: line,
          transform: `translateY(${(1 - line) * 26}px)`,
        }}
      >
        Telemetrix
      </h2>
      <p style={{ fontSize: 40, color: C.muted, marginTop: 20, opacity: line }}>
        telemetria, viagens e rastreamento
      </p>
      <p
        style={{
          fontSize: 30,
          color: C.primary,
          marginTop: 34,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: tail,
        }}
      >
        plano free para sempre
      </p>
    </AbsoluteFill>
  );
};
