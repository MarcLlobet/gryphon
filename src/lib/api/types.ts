import type { ThermalScene } from "@/lib/stac/scene";

/** Contract of Gryphon's own BFF endpoints (Next.js route handlers). */
export interface ScenesResponse {
  scenes: ThermalScene[];
}

export interface ApiErrorResponse {
  error: string;
}
