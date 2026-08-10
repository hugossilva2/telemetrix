import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** Camada de fundo persistente: gradiente escuro, grade e halo de menta em deriva. */
export const Backdrop = () => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame / 90) * 70;
  const driftY = Math.cos(frame / 120) * 50;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${C.bg} 0%, ${C.bgDeep} 70%, #0a1016 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 540 + driftX - 460,
          top: 420 + driftY - 460,
          width: 920,
          height: 920,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.primary}33 0%, transparent 65%)`,
          filter: "blur(40px)",
        }}
      />
    </AbsoluteFill>
  );
};
