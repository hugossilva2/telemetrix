import { UserRound } from "lucide-react";
import { useDriverPhoto } from "@/lib/drivers/api";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function DriverAvatar({
  name,
  photoPath,
  size = 40,
}: {
  name: string;
  photoPath: string | null | undefined;
  size?: number;
}) {
  const url = useDriverPhoto(photoPath);
  const style = { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        style={style}
        className="shrink-0 rounded-full border border-border object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <span
      style={style}
      className="grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary"
      aria-label={`Foto de ${name}`}
    >
      {initials(name) || <UserRound className="size-5" />}
    </span>
  );
}
