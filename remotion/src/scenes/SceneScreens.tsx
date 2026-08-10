import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

const SHOTS = [
  { file: "images/painel.png", label: "Painel" },
  { file: "images/viagens.png", label: "Viagens" },
  { file: "images/relatorio.png", label: "Relatório" },
  { file: "images/rastreio.png", label: "Rastreador" },
];

const Phone = ({ file, index }: { file: string; index: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const float = Math.sin((frame + index * 20) / 26) * 10;
  const tilt = interpolate(index, [0, 3], [-6, 6]);

  return (
    <div
      style={{
        width: 214,
        height: 430,
        borderRadius: 30,
        overflow: "hidden",
        border: `1px solid ${C.primary}44`,
        background: C.card,
        boxShadow: `0 30px 60px -26px rgba(0,0,0,0.8), 0 0 0 1px ${C.line}`,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 90 + float}px) rotate(${tilt}deg)`,
      }}
    >
      <Img src={staticFile(file)} style={{ width: "100%", display: "block" }} />
    </div>
  );
};

/** Cena 4 — montagem das telas reais do app com dados de exemplo. */
export const SceneScreens = () => {
  const frame = useCurrentFrame();
  const title = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily: body, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: title, transform: `translateY(${(1 - title) * -20}px)` }}>
        <span style={{ fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: C.primary }}>
          telas reais do app
        </span>
        <h2
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 70,
            margin: "14px 0 56px",
            color: C.fg,
            letterSpacing: -2,
          }}
        >
          Consumo, Eco Score,
          <br />
          manutenção e rastreio
        </h2>
      </div>

      <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
        {SHOTS.map((s, i) => (
          <Sequence key={s.file} from={8 + i * 9} layout="none">
            <Phone file={s.file} index={i} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
