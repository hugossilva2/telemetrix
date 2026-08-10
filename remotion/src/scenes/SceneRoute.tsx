import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

const ROUTE =
  "M90 830 C 210 780, 250 640, 380 610 C 520 578, 560 470, 520 380 C 484 296, 560 236, 700 250 C 840 264, 930 200, 960 120";

/** Cena 3 — a rota se desenhando no mapa com o cartão de custo da viagem. */
export const SceneRoute = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const draw = interpolate(frame, [8, 78], [0, 1], { extrapolateRight: "clamp" });
  const card = spring({ frame: frame - 44, fps, config: { damping: 18, stiffness: 110 } });
  const km = interpolate(draw, [0, 1], [0, 18.4]);
  const cost = interpolate(draw, [0, 1], [0, 14.9]);

  return (
    <AbsoluteFill style={{ fontFamily: body }}>
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={ROUTE} fill="none" stroke="rgba(240,255,250,0.10)" strokeWidth={16} strokeLinecap="round" />
        <path
          d={ROUTE}
          fill="none"
          stroke={C.primary}
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          style={{ filter: `drop-shadow(0 0 20px ${C.primary}cc)` }}
        />
        <circle cx={90} cy={830} r={16} fill={C.glow} opacity={0.9} />
      </svg>

      <div
        style={{
          position: "absolute",
          top: 96,
          left: 90,
          opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: C.primary }}>
          viagens automáticas
        </span>
        <h2
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 72,
            margin: "14px 0 0",
            color: C.fg,
            letterSpacing: -2,
          }}
        >
          Liga o carro,
          <br />
          o app registra tudo
        </h2>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 110,
          right: 80,
          width: 520,
          padding: 34,
          borderRadius: 30,
          background: `linear-gradient(160deg, ${C.surface}, ${C.card})`,
          border: `1px solid ${C.primary}55`,
          boxShadow: `0 24px 60px -22px ${C.primary}66`,
          opacity: card,
          transform: `translateY(${(1 - card) * 50}px) scale(${0.94 + card * 0.06})`,
        }}
      >
        <p style={{ margin: 0, fontSize: 26, color: C.muted }}>Salvador → Lauro de Freitas</p>
        <p
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 66,
            margin: "10px 0 22px",
            color: C.fg,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {km.toFixed(1)} km
        </p>
        <div style={{ display: "flex", gap: 40 }}>
          {[
            ["duração", "27 min"],
            ["média", "41 km/h"],
            ["custo", `R$ ${cost.toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k}>
              <p style={{ margin: 0, fontSize: 22, color: C.muted, textTransform: "uppercase", letterSpacing: 2 }}>
                {k}
              </p>
              <p
                style={{
                  fontFamily: display,
                  fontWeight: 500,
                  margin: "6px 0 0",
                  fontSize: 34,
                  color: k === "custo" ? C.primary : C.fg,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
