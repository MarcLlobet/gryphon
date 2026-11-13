import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GryphonEmblem } from "./GryphonEmblem";
import { GryphonPatch } from "./GryphonPatch";

describe("GryphonPatch", () => {
  it("is an image named after the product", () => {
    render(<GryphonPatch />);

    expect(screen.getByRole("img", { name: "Gryphon" })).toBeInTheDocument();
    expect(screen.getByText("GRYPHON")).toBeInTheDocument();
  });

  it("keeps clip and text paths unique when shown twice", () => {
    const { container } = render(
      <>
        <GryphonPatch />
        <GryphonPatch />
      </>,
    );

    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("GryphonEmblem", () => {
  it("is an image with an accessible name", () => {
    render(<GryphonEmblem title="Gryphon" />);

    expect(screen.getByRole("img", { name: "Gryphon" })).toBeInTheDocument();
  });
});
