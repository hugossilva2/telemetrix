import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { Backdrop } from "./components/Backdrop";
import { SceneHook } from "./scenes/SceneHook";
import { SceneGauges } from "./scenes/SceneGauges";
import { SceneRoute } from "./scenes/SceneRoute";
import { SceneScreens } from "./scenes/SceneScreens";
import { SceneOutro } from "./scenes/SceneOutro";

const D = [88, 96, 108, 100, 86];
const T = 18;
export const TOTAL_FRAMES = D.reduce((a, b) => a + b, 0) - T * 4;

const timing = springTiming({ config: { damping: 200 }, durationInFrames: T });

export const MainVideo = () => (
  <AbsoluteFill>
    <Backdrop />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={D[0]}>
        <SceneHook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={D[1]}>
        <SceneGauges />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={D[2]}>
        <SceneRoute />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={D[3]}>
        <SceneScreens />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={D[4]}>
        <SceneOutro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
