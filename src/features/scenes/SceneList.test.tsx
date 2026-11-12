import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { ApiErrorResponse, ScenesResponse } from "@/lib/api/types";
import { DEFAULT_BBOX } from "@/lib/geo/bbox";
import { thermalScenesFixture } from "@/mocks/fixtures/stac-items";
import { server } from "@/mocks/node";
import { renderWithQueryClient } from "@/test/render";
import { SceneList } from "./SceneList";

describe("SceneList", () => {
  it("shows a loading state, then one card per scene", async () => {
    renderWithQueryClient(<SceneList bbox={DEFAULT_BBOX} />);

    expect(screen.getByRole("status")).toHaveTextContent(/searching/i);

    const list = await screen.findByRole("list", { name: /thermal scenes/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(thermalScenesFixture.length);
    expect(within(list).getAllByRole("link", { name: /thermal band/i })[0]).toHaveAttribute(
      "href",
      thermalScenesFixture[0]?.thermalHref,
    );
  });

  it("formats acquisition date in UTC and cloud cover", async () => {
    renderWithQueryClient(<SceneList bbox={DEFAULT_BBOX} />);

    expect(await screen.findByRole("heading", { name: "3 Nov 2026, 10:32 UTC" })).toBeInTheDocument();
    expect(screen.getByText("3.2%")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    server.use(http.get<never, never, ScenesResponse>("*/api/scenes", () => HttpResponse.json({ scenes: [] })));

    renderWithQueryClient(<SceneList bbox={DEFAULT_BBOX} />);

    expect(await screen.findByText(/no thermal scenes/i)).toBeInTheDocument();
  });

  it("shows the API error message", async () => {
    server.use(
      http.get<never, never, ApiErrorResponse>("*/api/scenes", () =>
        HttpResponse.json({ error: "The thermal archive is unreachable right now." }, { status: 502 }),
      ),
    );

    renderWithQueryClient(<SceneList bbox={DEFAULT_BBOX} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unreachable/i);
  });
});
