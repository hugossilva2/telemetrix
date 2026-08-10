import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/DMSans";

export const display = loadDisplay("normal", { weights: ["500", "700"], subsets: ["latin"] })
  .fontFamily;
export const body = loadBody("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
