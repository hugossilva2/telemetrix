import { useEffect, useState } from "react";
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

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|heic|bmp)$/i;

export function DriverAvatar({
  name,
  photoPath,
  size = 40,
}: {
  name: string;
  photoPath: string | null | undefined;
  size?: number;
}) {
  const isImage = !!photoPath && IMAGE_EXT.test(photoPath);
  const url = useDriverPhoto(isImage ? photoPath : null);
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        style={style}
        onError={() => setFailed(true)}
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
