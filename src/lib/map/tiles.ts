import { useEffect, useState } from "react";

export type MapStyleId = "dark" | "light" | "streets" | "satellite";

export type TileLayerConfig = {
  url: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string;
};

export const MAP_STYLES: Record<
  MapStyleId,
  { label: string; layers: TileLayerConfig[] }
> = {
  dark: {
    label: "Escuro",
    layers: [
      {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: "&copy; OpenStreetMap · &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      },
    ],
  },
  light: {
    label: "Claro",
    layers: [
      {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: "&copy; OpenStreetMap · &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      },
    ],
  },
  streets: {
    label: "Ruas",
    layers: [
      {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      },
    ],
  },
  satellite: {
    label: "Satélite",
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles &copy; Esri",
        maxZoom: 19,
      },
      {
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
        attribution: "",
        subdomains: "abcd",
        maxZoom: 20,
      },
    ],
  },
};

const STORAGE_KEY = "mapStyle:v1";

function readStored(): MapStyleId {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && raw in MAP_STYLES) return raw as MapStyleId;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function useMapStyle(): [MapStyleId, (v: MapStyleId) => void] {
  const [style, setStyle] = useState<MapStyleId>("dark");

  useEffect(() => {
    setStyle(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue in MAP_STYLES) {
        setStyle(e.newValue as MapStyleId);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (v: MapStyleId) => {
    setStyle(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  };

  return [style, update];
}
