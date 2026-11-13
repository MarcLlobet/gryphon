import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { PresentedLayer } from "@/features/map/applyLayers";
import { SAMPLE_ORIGIN } from "@/mocks/fixtures/layers";
import { server } from "@/mocks/node";
import { renderWithConfig } from "@/test/render";
import { MapView } from "./MapView";

// The map itself is covered by applyLayers.test.ts; here we only check what reaches it.
const mapState = vi.hoisted(() => ({ broken: false }));

vi.mock("@/features/map/MapCanvas", () => ({
  MapCanvas: ({ layers }: { layers: readonly PresentedLayer[] }) => {
    if (mapState.broken) throw new Error("WebGL is not available");
    return <div data-testid="map" data-layers={layers.map((l) => `${l.spec.id}@${l.opacity}`).join(",")} />;
  },
}));

const document = {
  version: 1,
  title: "Test document",
  view: { bbox: [1.9, 41.25, 2.3, 41.5] },
  layers: [
    {
      id: "imagery",
      title: "Imagery",
      type: "stac",
      endpoint: `${SAMPLE_ORIGIN}/stac/v1`,
      tiler: `${SAMPLE_ORIGIN}/data/v1`,
      collection: "sample-collection",
      render: { assets: ["lwir11"], colormap_name: "inferno", rescale: [[36322, 50951]] },
      opacity: 0.8,
      legend: { kind: "ramp", unit: "°C", min: 0, max: 50, colors: ["#000004", "#fcffa4"] },
    },
    { id: "points", title: "Sample points", type: "geojson", url: `${SAMPLE_ORIGIN}/points.geojson` },
  ],
};

const mapLayers = () => screen.getByTestId("map").getAttribute("data-layers");

describe("MapView", () => {
  it("paints every visible layer, in document order", async () => {
    renderWithConfig(<MapView />, document);

    await waitFor(() => expect(mapLayers()).toBe("imagery@0.8,points@1"));
  });

  it("puts a visibility toggle on the map for each layer", async () => {
    renderWithConfig(<MapView />, document);

    expect(screen.getByRole("list", { name: /map layers, topmost first/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(2));
  });

  it("hides a layer when its toggle is pressed, and keeps the rest", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(mapLayers()).toContain("points"));

    await userEvent.click(screen.getByRole("button", { name: /^sample points,/i }));

    await waitFor(() => expect(mapLayers()).toBe("imagery@0.8"));
    expect(screen.getByRole("button", { name: /^sample points,/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("announces a failing layer on its toggle rather than only in colour", async () => {
    server.use(http.get(`${SAMPLE_ORIGIN}/points.geojson`, () => new HttpResponse(null, { status: 503 })));

    renderWithConfig(<MapView />, document);

    expect(await screen.findByRole("button", { name: /^sample points, failed to load/i })).toBeInTheDocument();
    // Partial failure, not a blank map.
    await waitFor(() => expect(mapLayers()).toBe("imagery@0.8"));
  });

  it("puts everything in one panel, with no separate legend panel", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(mapLayers()).toContain("imagery"));

    expect(screen.getByRole("region", { name: "Layers" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Legend" })).not.toBeInTheDocument();
  });

  it("puts the panel beside the map rather than over it", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(mapLayers()).toContain("imagery"));

    const panel = screen.getByRole("region", { name: "Layers" });
    const map = screen.getByTestId("map");

    // Siblings in the row, so neither can cover the other.
    expect(panel.parentElement).toBe(map.parentElement?.parentElement);
  });

  it("keeps the panel in the layout even when the document declares no layers", () => {
    renderWithConfig(<MapView />, { version: 1, layers: [] });

    expect(screen.getByRole("region", { name: "Layers" })).toBeInTheDocument();
  });

  it("keeps editing controls off the map", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(mapLayers()).toContain("imagery"));

    expect(screen.queryByLabelText("Opacity")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add layer/i })).not.toBeInTheDocument();
  });

  it("keeps a hidden layer marked preload on the map at opacity 0, ready to switch on", async () => {
    renderWithConfig(<MapView />, {
      ...document,
      layers: document.layers.map((layer) =>
        layer.id === "points" ? { ...layer, visible: false, preload: true } : layer,
      ),
    });

    await waitFor(() => expect(mapLayers()).toBe("imagery@0.8,points@0"));
  });

  it("does not load a hidden layer that is not marked preload", async () => {
    renderWithConfig(<MapView />, {
      ...document,
      layers: document.layers.map((layer) => (layer.id === "points" ? { ...layer, visible: false } : layer)),
    });

    await waitFor(() => expect(mapLayers()).toBe("imagery@0.8"));
  });

  it("keeps the layer panel working when the map cannot start", async () => {
    mapState.broken = true;
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderWithConfig(<MapView />, document);

      expect(screen.getByRole("alert")).toHaveTextContent(/map could not start/i);
      expect(screen.getByRole("region", { name: "Layers" })).toBeInTheDocument();
    } finally {
      mapState.broken = false;
      quiet.mockRestore();
    }
  });
});
