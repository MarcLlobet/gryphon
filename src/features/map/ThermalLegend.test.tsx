import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThermalLegend } from "./ThermalLegend";

describe("ThermalLegend", () => {
  it("describes the colour scale for screen readers", () => {
    render(<ThermalLegend />);

    expect(screen.getByRole("figure", { name: /land surface temperature/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /from 0 °C .* to 50 °C/i })).toBeInTheDocument();
  });

  it("shows evenly spaced ticks", () => {
    render(<ThermalLegend />);

    for (const tick of ["0", "10", "20", "30", "40", "50"]) {
      expect(screen.getByText(tick)).toBeInTheDocument();
    }
  });
});
