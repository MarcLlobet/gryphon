import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { PresentedLayer } from "@/features/map/applyLayers";
import { MapView } from "@/features/explorer/MapView";
import { ConfigView } from "./ConfigView";
import { SAMPLE_ORIGIN } from "@/mocks/fixtures/layers";
import { server } from "@/mocks/node";
import { renderWithConfig } from "@/test/render";

vi.mock("@/features/map/MapCanvas", () => ({
  MapCanvas: ({ layers }: { layers: readonly PresentedLayer[] }) => (
    <div data-testid="map" data-layers={layers.map((layer) => layer.spec.id).join(",")} />
  ),
}));

/**
 * Both views share one provider — in the app that provider lives in the root layout,
 * so moving between the map and the configuration page never remounts it. Rendering
 * them together is the same relationship, minus the router.
 */
const App = () => (
  <>
    <MapView />
    <ConfigView />
  </>
);

/** An empty document, so anything on the map got there through the form. */
const emptyDocument = { version: 1, title: "Empty", view: { bbox: [1.9, 41.25, 2.3, 41.5] }, layers: [] };

const mapLayers = () => screen.getByTestId("map").getAttribute("data-layers");

const fill = async (label: string, value: string) => {
  const field = screen.getByLabelText(new RegExp(`^${label}`));
  await userEvent.clear(field);
  await userEvent.type(field, value);
};

/** The gallery card for a protocol, found by its plain-language heading. */
const card = (name: string) => screen.getByRole("heading", { name }).closest("li") as HTMLElement;

/** Opens a card's form; it loads lazily, so wait for its first field. */
const openForm = async (name: string) => {
  await userEvent.click(within(card(name)).getByRole("button", { name: "Customise" }));
  await screen.findByLabelText(/^Identifier/);
};

describe("adding a layer at runtime", () => {
  it("offers one card per protocol this build can paint, in plain words", () => {
    renderWithConfig(<App />, emptyDocument);

    const cards = within(screen.getByRole("list", { name: /ways to add a layer/i })).getAllByRole("listitem");
    expect(cards).toHaveLength(6);
    expect(screen.getByRole("heading", { name: "Satellite scenes" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Protocol")).not.toBeInTheDocument();
  });

  it("adds a card's example in one click", async () => {
    renderWithConfig(<App />, emptyDocument);

    await userEvent.click(within(card("Points, lines or areas")).getByRole("button", { name: "Add example" }));

    await waitFor(() => expect(mapLayers()).toContain("example-quakes"));
    expect(within(card("Points, lines or areas")).getByRole("button", { name: "Example on the map" })).toBeDisabled();
  });

  it("renders a customised layer exactly as if the document had declared it", async () => {
    renderWithConfig(<App />, emptyDocument);
    expect(mapLayers()).toBe("");

    await openForm("Points, lines or areas");
    await fill("Identifier", "added-points");
    await fill("Title", "Added points");
    await fill("GeoJSON URL", `${SAMPLE_ORIGIN}/points.geojson`);
    await userEvent.click(screen.getByRole("button", { name: /add layer/i }));

    await waitFor(() => expect(mapLayers()).toBe("added-points"));
    expect(screen.getByRole("list", { name: /document layers/i })).toHaveTextContent("Added points");
  });

  it("opens each form with that protocol's working example", async () => {
    renderWithConfig(<App />, emptyDocument);

    await openForm("Points, lines or areas");
    expect(screen.getByLabelText(/^Identifier/)).toHaveValue("example-quakes");

    await openForm("Satellite scenes");
    expect(screen.getByLabelText(/^Collection/)).toHaveValue("sentinel-2-l2a");
  });

  it("keeps one form open at a time", async () => {
    renderWithConfig(<App />, emptyDocument);

    await openForm("Points, lines or areas");
    await openForm("Map tiles");

    expect(screen.getAllByLabelText(/^Identifier/)).toHaveLength(1);
    expect(within(card("Points, lines or areas")).getByRole("button", { name: "Customise" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("refuses an invalid field and says which one, instead of adding a broken layer", async () => {
    renderWithConfig(<App />, emptyDocument);

    await openForm("Points, lines or areas");
    await fill("Identifier", "bad");
    await fill("Title", "Bad layer");
    await fill("GeoJSON URL", "not-a-url");
    await userEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText(/^GeoJSON URL/)).toHaveAttribute("aria-invalid", "true");
    expect(mapLayers()).toBe("");
  });

  it("clears the example to start from scratch", async () => {
    renderWithConfig(<App />, emptyDocument);

    await openForm("Points, lines or areas");
    await userEvent.click(screen.getByRole("button", { name: /clear the form/i }));

    expect(screen.getByLabelText(/^Identifier/)).toHaveValue("");
    expect(screen.getByLabelText(/^GeoJSON URL/)).toHaveValue("");
  });

  it("asks for a credential at render time and never writes it into the document", async () => {
    server.use(
      http.get(`${SAMPLE_ORIGIN}/secure.csv`, ({ request }) =>
        new URL(request.url).searchParams.get("MAP_KEY") === "secret-key"
          ? HttpResponse.text("latitude,longitude,frp\n41.4,2.1,120\n")
          : new HttpResponse(null, { status: 401 }),
      ),
    );

    renderWithConfig(<App />, emptyDocument);

    await openForm("A table with coordinates");
    await fill("Identifier", "fires");
    await fill("Title", "Active fire");
    await fill("CSV URL", `${SAMPLE_ORIGIN}/secure.csv`);
    await fill("Latitude column", "latitude");
    await fill("Longitude column", "longitude");
    await fill("Credential name", "MAP_KEY");
    await userEvent.click(screen.getByRole("button", { name: /add layer/i }));

    // Without a key the layer asks for one rather than failing silently.
    const keyField = await screen.findByLabelText("MAP_KEY");
    expect(mapLayers()).toBe("");

    await userEvent.type(keyField, "secret-key");
    await userEvent.click(screen.getByRole("button", { name: /use key/i }));

    await waitFor(() => expect(mapLayers()).toBe("fires"));
  });
});

describe("your layers", () => {
  const withOneLayer = {
    ...emptyDocument,
    layers: [
      {
        id: "points",
        title: "Sample points",
        type: "geojson",
        url: `${SAMPLE_ORIGIN}/points.geojson`,
        opacity: 0.7,
        style: { color: "#ffc93c" },
      },
    ],
  };

  it("shows a layer's settings in its own form, locked", async () => {
    renderWithConfig(<App />, withOneLayer);

    await userEvent.click(screen.getByRole("button", { name: "Settings of Sample points" }));

    const settings = await screen.findByRole("group", { name: "Sample points settings" });
    expect(settings).toBeDisabled();
    expect(within(settings).getByLabelText(/^Identifier/)).toHaveValue("points");
    expect(within(settings).getByLabelText(/^GeoJSON URL/)).toHaveValue(`${SAMPLE_ORIGIN}/points.geojson`);
    expect(within(settings).getByLabelText(/^Colour/)).toHaveValue("#ffc93c");
  });

  it("also shows what the form has no field for, as declared", async () => {
    renderWithConfig(<App />, withOneLayer);

    await userEvent.click(screen.getByRole("button", { name: "Settings of Sample points" }));

    const settings = await screen.findByRole("group", { name: "Sample points settings" });
    expect(within(settings).getByText(/"opacity": 0.7/)).toBeInTheDocument();
  });
});
