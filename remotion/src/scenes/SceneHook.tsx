import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

/** Cena 1 — gancho: linha de performance tipo ECG desenhando e a marca surgindo. */
export const SceneHook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const path =
    "M0 120 L 210 120 L 250 120 L 290 40 L 330 205 L 372 78 L 410 120 L 620 120 L 660 120 L 700 60 L 740 180 L 780 120 L 1080 120";
  const draw = interpolate(frame, [0, 42], [0, 1], { extrapolateRight: "clamp" });

  const brand = spring({ frame: frame - 22, fps, config: { damping: 16, stiffness: 120 } });
  const sub = interpolate(frame, [46, 66], [0, 1], { extrapolateRight: "clamp" });
  const breathe = 1 + Math.sin(frame / 22) * 0.008;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: body }}>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0 }}>
        <svg width={1080} height={240} viewBox="0 0 1080 240">
          <path
            d={path}
            fill="none"
            stroke={C.primary}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            style={{ filter: `drop-shadow(0 0 18px ${C.primary})` }}
          />
        </svg>
      </div>

      <div
        style={{
          marginTop: 210,
          textAlign: "center",
          opacity: brand,
          transform: `scale(${(0.9 + brand * 0.1) * breathe})`,
        }}
      >
        <h1
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 132,
            margin: 0,
            letterSpacing: -3,
            color: C.fg,
          }}
        >
          Telemetrix
        </h1>
        <p
          style={{
            marginTop: 18,
            fontSize: 40,
            color: C.muted,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 18}px)`,
          }}
        >
          o painel do seu carro no celular
        </p>
      </div>
    </AbsoluteFill>
  );
};
