import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SidePanel } from "./SidePanel";

const renderPanel = (props: Partial<React.ComponentProps<typeof SidePanel>> = {}) =>
  render(
    <SidePanel id="layer-panel" title="Layers" initialWidth={300} minWidth={200} maxWidth={500} {...props}>
      <p>Panel contents</p>
    </SidePanel>,
  );

const panel = () => document.getElementById("layer-panel")!;
const resizer = () => screen.getByRole("separator", { name: /resize layers/i });

describe("SidePanel", () => {
  it("shows its contents and names itself", () => {
    renderPanel();

    expect(screen.getByRole("region", { name: "Layers" })).toBeInTheDocument();
    expect(panel()).toHaveStyle({ width: "300px" });
    expect(screen.getByText("Panel contents")).toBeVisible();
  });

  it("hides without leaving the DOM, so the header's aria-controls still resolves", () => {
    renderPanel({ open: false });

    expect(panel()).toBeInTheDocument();
    expect(panel()).toHaveAttribute("hidden");
    expect(screen.queryByRole("region", { name: "Layers" })).not.toBeInTheDocument();
  });

  it("offers no resize grip while hidden", () => {
    renderPanel({ open: false });

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("carries no show/hide control of its own — that lives in the header", () => {
    renderPanel();

    expect(screen.queryByRole("button", { name: /layers/i })).not.toBeInTheDocument();
  });

  it("resizes horizontally by dragging the grip", () => {
    renderPanel();

    fireEvent.pointerDown(resizer(), { pointerId: 1, clientX: 0 });
    fireEvent.pointerMove(resizer(), { pointerId: 1, clientX: 80 });
    fireEvent.pointerUp(resizer(), { pointerId: 1, clientX: 80 });

    expect(panel()).toHaveStyle({ width: "380px" });
  });

  it("stops at its limits instead of collapsing or filling the screen", () => {
    renderPanel();

    fireEvent.pointerDown(resizer(), { pointerId: 1, clientX: 0 });
    fireEvent.pointerMove(resizer(), { pointerId: 1, clientX: -9999 });
    expect(panel()).toHaveStyle({ width: "200px" });

    fireEvent.pointerMove(resizer(), { pointerId: 1, clientX: 9999 });
    expect(panel()).toHaveStyle({ width: "500px" });
  });

  it("ignores pointer movement that did not start on the grip", () => {
    renderPanel();

    fireEvent.pointerMove(resizer(), { pointerId: 1, clientX: 400 });

    expect(panel()).toHaveStyle({ width: "300px" });
  });

  it("resizes from the keyboard too, since dragging is not always possible", async () => {
    renderPanel();
    resizer().focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(panel()).toHaveStyle({ width: "324px" });

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(panel()).toHaveStyle({ width: "276px" });

    await userEvent.keyboard("{End}");
    expect(panel()).toHaveStyle({ width: "500px" });

    await userEvent.keyboard("{Home}");
    expect(panel()).toHaveStyle({ width: "200px" });
  });

  it("reports its width to assistive technology, on the correct axis", async () => {
    renderPanel();

    expect(resizer()).toHaveAttribute("aria-orientation", "vertical");
    expect(resizer()).toHaveAttribute("aria-valuenow", "300");
    expect(resizer()).toHaveAttribute("aria-valuemin", "200");
    expect(resizer()).toHaveAttribute("aria-valuemax", "500");

    resizer().focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(resizer()).toHaveAttribute("aria-valuenow", "324");
  });
});
