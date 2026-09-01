import { TileLayer } from "react-leaflet";
import { MAP_STYLES, type MapStyleId } from "@/lib/map/tiles";

export function StyledTileLayers({ style }: { style: MapStyleId }) {
  const layers = MAP_STYLES[style].layers;
  return (
    <>
      {layers.map((l, i) => (
        <TileLayer
          key={`${style}-${i}`}
          url={l.url}
          attribution={l.attribution}
          maxZoom={l.maxZoom}
          {...(l.className ? { className: l.className } : {})}
          {...(l.subdomains ? { subdomains: l.subdomains } : {})}
        />
      ))}
    </>
  );
}
