import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/AppHeader";
import type { PresentedLayer } from "@/features/map/applyLayers";
import { MapView } from "@/features/explorer/MapView";
import { SAMPLE_ORIGIN } from "@/mocks/fixtures/layers";
import { renderWithConfig } from "@/test/render";
import { LAYER_PANEL_ID, PanelToggle } from "./panel";

vi.mock("@/features/map/MapCanvas", () => ({
  MapCanvas: ({ layers }: { layers: readonly PresentedLayer[] }) => (
    <div data-testid="map" data-layers={layers.map((l) => l.spec.id).join(",")} />
  ),
}));

const document_ = {
  version: 1,
  view: { bbox: [1.9, 41.25, 2.3, 41.5] },
  layers: [{ id: "points", title: "Points", type: "geojson", url: `${SAMPLE_ORIGIN}/points.geojson` }],
};

/** The header and the panel are siblings, exactly as the page composes them. */
const App = () => (
  <>
    <AppHeader leading={<PanelToggle />} />
    <MapView />
  </>
);

const toggle = () => screen.getByRole("button", { name: /(show|hide) the layers panel/i });
const panel = () => window.document.getElementById(LAYER_PANEL_ID)!;

describe("the header's panel toggle", () => {
  it("sits before the wordmark", async () => {
    renderWithConfig(<App />, document_);
    await waitFor(() => expect(screen.getByTestId("map")).toBeInTheDocument());

    const header = screen.getByRole("banner");
    // The wordmark is the logo link back to the map.
    const order = [...header.querySelectorAll("button, a")];

    expect(order[0]).toBe(toggle());
    expect(order[1]).toHaveTextContent("GRYPHON");
  });

  it("points at the panel it controls, and reports its state", async () => {
    renderWithConfig(<App />, document_);
    await waitFor(() => expect(screen.getByTestId("map")).toBeInTheDocument());

    expect(toggle()).toHaveAttribute("aria-controls", LAYER_PANEL_ID);
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(panel()).not.toHaveAttribute("hidden");
  });

  it("hides the panel, and says so", async () => {
    renderWithConfig(<App />, document_);
    await waitFor(() => expect(screen.getByTestId("map")).toBeInTheDocument());

    await userEvent.click(toggle());

    expect(panel()).toHaveAttribute("hidden");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveAccessibleName("Show the layers panel");
  });

  it("brings it back", async () => {
    renderWithConfig(<App />, document_);
    await waitFor(() => expect(screen.getByTestId("map")).toBeInTheDocument());

    await userEvent.click(toggle());
    await userEvent.click(toggle());

    expect(panel()).not.toHaveAttribute("hidden");
    expect(toggle()).toHaveAccessibleName("Hide the layers panel");
  });

  it("keeps the map painting either way", async () => {
    renderWithConfig(<App />, document_);
    await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-layers", "points"));

    await userEvent.click(toggle());

    expect(screen.getByTestId("map")).toHaveAttribute("data-layers", "points");
  });
});
