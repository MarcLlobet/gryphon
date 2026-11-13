import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PresentedLayer } from "@/features/map/applyLayers";
import { MapView } from "@/features/explorer/MapView";
import { useConfig } from "@/features/config/ConfigProvider";
import { LayerStack } from "./LayerStack";
import { useLayers } from "./useLayers";
import { SAMPLE_ORIGIN } from "@/mocks/fixtures/layers";
import { renderWithConfig } from "@/test/render";

vi.mock("@/features/map/MapCanvas", () => ({
  MapCanvas: ({ layers }: { layers: readonly PresentedLayer[] }) => (
    <div data-testid="map" data-layers={layers.map((l) => l.spec.id).join(",")} />
  ),
}));

const layer = (id: string, title: string) => ({
  id,
  title,
  type: "geojson",
  url: `${SAMPLE_ORIGIN}/points.geojson`,
});

/** Document order is bottom-first, so "top" is painted last. */
const document = {
  version: 1,
  title: "Stack",
  view: { bbox: [1.9, 41.25, 2.3, 41.5] },
  layers: [layer("bottom", "Bottom layer"), layer("middle", "Middle layer"), layer("top", "Top layer")],
};

const paintOrder = () => screen.getByTestId("map").getAttribute("data-layers");
const rowTitles = () =>
  screen.getAllByRole("button", { pressed: true }).map((button) => button.textContent?.replace(/,.*$/, "").trim());

const gripFor = (title: string) => screen.getByRole("button", { name: new RegExp(`^Reorder ${title},`) });

/** jsdom has no layout, so rows report identical rects; place them by hand. */
const stubRowGeometry = (heights: number[]) => {
  const items = screen.getAllByRole("listitem");
  items.forEach((item, index) => {
    vi.spyOn(item, "getBoundingClientRect").mockReturnValue({
      top: heights[index]!,
      height: 40,
      bottom: heights[index]! + 40,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: heights[index]!,
      toJSON: () => ({}),
    } as DOMRect);
  });
};

describe("LayerStack", () => {
  it("lists layers topmost first, the opposite of paint order", async () => {
    renderWithConfig(<MapView />, document);

    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));
    expect(rowTitles()).toEqual(["Top layer", "Middle layer", "Bottom layer"]);
  });

  it("says in its accessible name that the first row is the topmost layer", () => {
    renderWithConfig(<MapView />, document);

    expect(screen.getByRole("list", { name: /map layers, topmost first/i })).toBeInTheDocument();
  });

  it("moves a layer up the stack with the keyboard alone", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    gripFor("Bottom layer").focus();
    await userEvent.keyboard("{ArrowUp}");

    // Up the visible list means later in paint order: it now covers "middle".
    expect(rowTitles()).toEqual(["Top layer", "Bottom layer", "Middle layer"]);
    await waitFor(() => expect(paintOrder()).toBe("middle,bottom,top"));
  });

  it("moves a layer down the stack with the keyboard alone", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    gripFor("Top layer").focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(rowTitles()).toEqual(["Middle layer", "Top layer", "Bottom layer"]);
  });

  it("stops at the ends instead of wrapping around", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    gripFor("Top layer").focus();
    await userEvent.keyboard("{ArrowUp}");

    expect(rowTitles()).toEqual(["Top layer", "Middle layer", "Bottom layer"]);
  });

  it("announces every move, so the change is not purely visual", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    gripFor("Bottom layer").focus();
    await userEvent.keyboard("{ArrowUp}");

    expect(screen.getByRole("status")).toHaveTextContent("Bottom layer moved to position 2 of 3, above Middle layer.");
  });

  it("reorders by dragging the grip", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    stubRowGeometry([0, 50, 100]);
    const grip = gripFor("Top layer");

    // Pointer Events, not HTML5 drag-and-drop, so one path covers touch and mouse.
    fireEvent.pointerDown(grip, { pointerId: 1, clientY: 20 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 125 });
    fireEvent.pointerUp(grip, { pointerId: 1, clientY: 125 });

    expect(rowTitles()).toEqual(["Middle layer", "Bottom layer", "Top layer"]);
    await waitFor(() => expect(paintOrder()).toBe("top,bottom,middle"));
  });

  it("leaves the order alone when a drag ends where it started", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    stubRowGeometry([0, 50, 100]);
    const grip = gripFor("Top layer");

    fireEvent.pointerDown(grip, { pointerId: 1, clientY: 20 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 25 });
    fireEvent.pointerUp(grip, { pointerId: 1, clientY: 25 });

    expect(rowTitles()).toEqual(["Top layer", "Middle layer", "Bottom layer"]);
  });

  it("keeps grabbing and toggling on separate targets", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    await userEvent.click(screen.getByRole("button", { name: /^Top layer,/ }));

    // Toggling visibility must not have disturbed the order.
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle"));
    expect(screen.getByRole("button", { name: /^Top layer,/ })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("a layer's legend", () => {
  const withLegend = {
    version: 1,
    title: "Legends",
    view: { bbox: [1.9, 41.25, 2.3, 41.5] },
    layers: [
      { ...layer("plain", "Plain layer") },
      {
        ...layer("scaled", "Scaled layer"),
        legend: { kind: "ramp", unit: "°C", min: 0, max: 50, colors: ["#000004", "#fcffa4"] },
      },
    ],
  };

  const disclosure = () => screen.getByRole("button", { name: /legend for scaled layer/i });

  it("is a collapsed sub-item of the layer it describes", async () => {
    renderWithConfig(<MapView />, withLegend);
    await waitFor(() => expect(paintOrder()).toContain("scaled"));

    expect(disclosure()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });

  it("expands in place, inside its own row", async () => {
    renderWithConfig(<MapView />, withLegend);
    await waitFor(() => expect(paintOrder()).toContain("scaled"));

    await userEvent.click(disclosure());

    expect(disclosure()).toHaveAttribute("aria-expanded", "true");
    // The legend is loaded the first time it is opened.
    const figure = await screen.findByRole("figure", { name: /scaled layer scale/i });
    expect(figure).toBeInTheDocument();
    // Nested in the row, not floating somewhere else in the panel.
    expect(disclosure().closest("li")).toContainElement(figure);
  });

  it("collapses again", async () => {
    renderWithConfig(<MapView />, withLegend);
    await waitFor(() => expect(paintOrder()).toContain("scaled"));

    await userEvent.click(disclosure());
    await userEvent.click(disclosure());

    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });

  it("is offered only by layers that have one", async () => {
    renderWithConfig(<MapView />, withLegend);
    await waitFor(() => expect(paintOrder()).toContain("scaled"));

    expect(screen.queryByRole("button", { name: /legend for plain layer/i })).not.toBeInTheDocument();
  });

  it("does not interfere with reordering that row", async () => {
    renderWithConfig(<MapView />, withLegend);
    await waitFor(() => expect(paintOrder()).toBe("plain,scaled"));

    await userEvent.click(disclosure());
    gripFor("Scaled layer").focus();
    await userEvent.keyboard("{ArrowDown}");

    await waitFor(() => expect(paintOrder()).toBe("scaled,plain"));
    expect(screen.getByRole("figure", { name: /scaled layer scale/i })).toBeInTheDocument();
  });
});

describe("row numbering and the drag handle", () => {
  const positions = () => screen.getAllByRole("listitem").map((row) => row.querySelector("span")?.textContent);

  it("numbers the rows from the top of the stack down", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    expect(positions()).toEqual(["1", "2", "3"]);
    expect(rowTitles()).toEqual(["Top layer", "Middle layer", "Bottom layer"]);
  });

  it("renumbers after a reorder, so the number always matches the position", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    gripFor("Top layer").focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(rowTitles()).toEqual(["Middle layer", "Top layer", "Bottom layer"]);
    expect(positions()).toEqual(["1", "2", "3"]);
    // The handle keeps naming its own new position too.
    expect(gripFor("Top layer")).toHaveAccessibleName(/2 of 3/);
  });

  it("keeps the handle in the DOM, so it is reachable without a pointer", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    // Revealed by hover and by focus in CSS, but never removed — a grip that only
    // exists on hover cannot be tabbed to.
    const grip = gripFor("Middle layer");
    expect(grip).toBeInTheDocument();
    grip.focus();
    expect(grip).toHaveFocus();
  });

  it("marks enabled layers persistently, not only while hovered", async () => {
    renderWithConfig(<MapView />, document);
    await waitFor(() => expect(paintOrder()).toBe("bottom,middle,top"));

    const rows = screen.getAllByRole("listitem");
    expect(rows.every((row) => row.hasAttribute("data-active"))).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /^Top layer,/ }));

    await waitFor(() => expect(screen.getAllByRole("listitem")[0]).not.toHaveAttribute("data-active"));
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute("data-active");
  });
});

/** The configuration page's list, plus the document order it edits. */
const EditList = () => {
  const layers = useLayers();
  const { config } = useConfig();
  return (
    <>
      <LayerStack layers={layers} mode="edit" />
      <p data-testid="order">{config.layers.map((l) => l.id).join(",")}</p>
    </>
  );
};

describe("LayerStack on the configuration page", () => {
  it("shows each layer by icon and title, topmost first, without on/off state or legends", () => {
    renderWithConfig(<EditList />, document);

    const list = screen.getByRole("list", { name: /document layers, topmost first/i });
    expect(list).toHaveTextContent(/Top layer.*Middle layer.*Bottom layer/);
    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { pressed: false })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /legend for/i })).not.toBeInTheDocument();
  });

  it("removes a layer with its trash button", async () => {
    renderWithConfig(<EditList />, document);

    await userEvent.click(screen.getByRole("button", { name: "Remove Middle layer" }));

    expect(screen.getByTestId("order")).toHaveTextContent("bottom,top");
    expect(screen.queryByText("Middle layer")).not.toBeInTheDocument();
  });

  it("reorders with the same grip as the map, by keyboard too", async () => {
    renderWithConfig(<EditList />, document);

    gripFor("Top layer").focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(screen.getByTestId("order")).toHaveTextContent("bottom,top,middle");
  });

  it("shows where each layer's data comes from, as a link", () => {
    renderWithConfig(<EditList />, document);

    const links = screen.getAllByRole("link", { name: `${SAMPLE_ORIGIN}/points.geojson` });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("target", "_blank");
  });
});
