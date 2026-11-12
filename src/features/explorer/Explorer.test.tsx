import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BBOX } from "@/lib/geo/bbox";
import type { ThermalScene } from "@/lib/stac/scene";
import { thermalScenesFixture } from "@/mocks/fixtures/stac-items";
import { renderWithQueryClient } from "@/test/render";
import { Explorer } from "./Explorer";

// The map itself is covered by ThermalMap.test.tsx; here we only check what it receives.
vi.mock("@/features/map/ThermalMap", () => ({
  ThermalMap: ({ scene, opacity }: { scene: ThermalScene | null; opacity: number }) => (
    <div data-testid="map" data-scene={scene?.id ?? "none"} data-opacity={opacity} />
  ),
}));

const [first, second] = thermalScenesFixture;

describe("Explorer", () => {
  it("shows the most recent scene on the map by default", async () => {
    renderWithQueryClient(<Explorer bbox={DEFAULT_BBOX} areaName="Barcelona" />);

    expect(screen.getByRole("heading", { name: "Surface temperature · Barcelona" })).toBeInTheDocument();
    await screen.findAllByRole("button", { name: /show on map/i });
    expect(screen.getByTestId("map")).toHaveAttribute("data-scene", first?.id);
  });

  it("puts the scene the user picks on the map", async () => {
    renderWithQueryClient(<Explorer bbox={DEFAULT_BBOX} areaName="Barcelona" />);

    const buttons = await screen.findAllByRole("button", { name: /show on map/i });
    await userEvent.click(buttons[1]!);

    expect(screen.getByTestId("map")).toHaveAttribute("data-scene", second?.id);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("controls the thermal layer opacity", () => {
    renderWithQueryClient(<Explorer bbox={DEFAULT_BBOX} areaName="Barcelona" />);

    fireEvent.change(screen.getByLabelText(/thermal layer opacity/i), { target: { value: "0.35" } });

    expect(screen.getByTestId("map")).toHaveAttribute("data-opacity", "0.35");
  });
});
