import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { Gauge } from "../components/Gauge";
import { display, body } from "../fonts";

/** Cena 2 — mostradores neon acelerando (velocidade, giro, combustível). */
export const SceneGauges = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rev = interpolate(frame, [6, 52, 74], [0, 1, 0.82], { extrapolateRight: "clamp" });
  const speed = Math.round(interpolate(rev, [0, 1], [0, 92]));
  const rpm = interpolate(rev, [0, 1], [780, 3100]);
  const fuel = 0.42 + Math.sin(frame / 30) * 0.004;

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ fontFamily: body, padding: 90, justifyContent: "center" }}>
      <span
        style={{
          fontSize: 26,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: C.primary,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        telemetria ao vivo · obd-ii
      </span>
      <h2
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 76,
          margin: "16px 0 60px",
          color: C.fg,
          letterSpacing: -2,
          transform: `translateX(${(1 - enter) * -40}px)`,
          opacity: enter,
        }}
      >
        Cada giro do motor,
        <br />
        em tempo real
      </h2>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 46 }}>
        <Sequence from={4} layout="none">
          <Gauge
            size={340}
            strokeWidth={20}
            progress={speed / 160}
            label="velocidade"
            value={String(speed)}
            unit="km/h"
          />
        </Sequence>
        <Sequence from={14} layout="none">
          <Gauge
            size={240}
            progress={rpm / 7000}
            label="giro"
            value={(rpm / 1000).toFixed(1)}
            unit="x1000 rpm"
            color={rpm > 2800 ? C.warning : C.primary}
          />
        </Sequence>
        <Sequence from={24} layout="none">
          <Gauge
            size={240}
            progress={fuel}
            label="combustível"
            value={`${Math.round(fuel * 100)}%`}
            unit="estimado"
            color={C.glow}
          />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};
