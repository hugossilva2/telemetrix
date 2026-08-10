import { cn } from "@/lib/utils";
import type { ScreenShotInfo } from "@/lib/demo/screens";

interface Props {
  screen: ScreenShotInfo;
  className?: string;
  /** Carrega a imagem imediatamente (use no herói da home). */
  priority?: boolean;
}

/**
 * Print real de uma tela do app dentro de uma moldura de celular.
 * Apenas apresentação — a imagem vem do CDN de assets.
 */
export function ScreenShot({ screen, className, priority = false }: Props) {
  return (
    <figure
      className={cn(
        "relative mx-auto w-full max-w-[320px] rounded-[2.2rem] border border-border/80 bg-card p-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-muted/60" />
      <img
        src={screen.url}
        alt={screen.alt}
        width={390}
        height={740}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="w-full rounded-[1.8rem] bg-background"
      />
      <figcaption className="pt-2 text-center text-xs text-muted-foreground">
        {screen.title} · dados fictícios
      </figcaption>
    </figure>
  );
}
