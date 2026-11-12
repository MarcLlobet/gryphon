import { useQuery } from "@tanstack/react-query";
import type { ApiErrorResponse, ScenesResponse } from "@/lib/api/types";
import { formatBBox, type BBox } from "@/lib/geo/bbox";
import type { ThermalScene } from "@/lib/stac/scene";

export const scenesQueryKey = (bbox: BBox) => ["scenes", formatBBox(bbox)] as const;

export const fetchScenes = async (bbox: BBox): Promise<ThermalScene[]> => {
  const url = new URL("/api/scenes", window.location.origin);
  url.searchParams.set("bbox", formatBBox(bbox));

  const response = await fetch(url);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(body?.error ?? `Failed to load scenes (${response.status})`);
  }

  const { scenes } = (await response.json()) as ScenesResponse;
  return scenes;
};

export const useScenes = (bbox: BBox) =>
  useQuery({
    queryKey: scenesQueryKey(bbox),
    queryFn: () => fetchScenes(bbox),
  });
