import { NextResponse, type NextRequest } from "next/server";
import type { ApiErrorResponse, ScenesResponse } from "@/lib/api/types";
import { DEFAULT_BBOX, parseBBox } from "@/lib/geo/bbox";
import { searchThermalScenes } from "@/lib/stac/client";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ScenesResponse | ApiErrorResponse>> {
  const rawBBox = request.nextUrl.searchParams.get("bbox");
  const bbox = rawBBox === null ? DEFAULT_BBOX : parseBBox(rawBBox);

  if (bbox === null) {
    return NextResponse.json(
      { error: "Invalid bbox. Expected west,south,east,north in degrees." },
      { status: 400 },
    );
  }

  try {
    const scenes = await searchThermalScenes({ bbox });
    return NextResponse.json({ scenes });
  } catch {
    return NextResponse.json({ error: "The thermal archive is unreachable right now." }, { status: 502 });
  }
}
