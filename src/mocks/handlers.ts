import { http, HttpResponse } from "msw";
import type { ApiErrorResponse, ScenesResponse } from "@/lib/api/types";
import { STAC_API_URL } from "@/lib/stac/client";
import type { StacItemCollection, StacSearchBody } from "@/lib/stac/types";
import { stacItemsFixture, thermalScenesFixture } from "./fixtures/stac-items";

/** External: the public STAC API (used by route handlers and local dev). */
export const stacHandlers = [
  http.post<never, StacSearchBody, StacItemCollection>(`${STAC_API_URL}/search`, async ({ request }) => {
    const body = await request.json();
    const features = stacItemsFixture.slice(0, body.limit ?? stacItemsFixture.length);
    return HttpResponse.json({ type: "FeatureCollection", features });
  }),
];

/** Internal: Gryphon's own BFF (used by component tests). */
export const apiHandlers = [
  http.get<never, never, ScenesResponse | ApiErrorResponse>("*/api/scenes", () =>
    HttpResponse.json({ scenes: thermalScenesFixture }),
  ),
];

export const handlers = [...stacHandlers, ...apiHandlers];
