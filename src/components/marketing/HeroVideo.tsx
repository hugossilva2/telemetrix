import { useState } from "react";
import { cn } from "@/lib/utils";
import heroVideo from "@/assets/video/telemetrix-hero.mp4.asset.json";
import heroVideoWebm from "@/assets/video/telemetrix-hero.webm.asset.json";
import { SCREENSHOT_BY_ID } from "@/lib/demo/screens";

interface Props {
  className?: string;
}

/**
 * Vídeo curto do produto (autoplay silencioso, em loop) usado no herói da home.
 * Com pôster do print do painel e fallback de imagem se o vídeo falhar.
 */
export function HeroVideo({ className }: Props) {
  const [failed, setFailed] = useState(false);
  const poster = SCREENSHOT_BY_ID.painel;

  return (
    <figure
      className={cn(
        "relative mx-auto w-full max-w-[440px] overflow-hidden rounded-[1.8rem] border border-border/80 bg-card p-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      {failed ? (
        <img
          src={poster.url}
          alt={poster.alt}
          width={390}
          height={740}
          className="w-full rounded-[1.4rem] bg-background"
        />
      ) : (
        <video
          src={heroVideo.url}
          poster={poster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Vídeo do Telemetrix mostrando mostradores ao vivo, rota da viagem e telas do app"
          onError={() => setFailed(true)}
          className="aspect-square w-full rounded-[1.4rem] bg-background object-cover"
        />
      )}
      <figcaption className="pt-2 text-center text-xs text-muted-foreground">
        Telemetrix em ação · dados fictícios
      </figcaption>
    </figure>
  );
}
