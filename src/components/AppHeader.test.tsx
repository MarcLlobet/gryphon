import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader, SettingsLink } from "./AppHeader";

describe("AppHeader", () => {
  it("takes you to the map from the logo", () => {
    render(<AppHeader action={<SettingsLink />} />);

    expect(screen.getByRole("link", { name: "Gryphon, go to the map" })).toHaveAttribute("href", "/");
  });

  it("links to the configuration from an icon with an accessible name", () => {
    render(<AppHeader action={<SettingsLink />} />);

    const settings = screen.getByRole("link", { name: "Configuration" });
    expect(settings).toHaveAttribute("href", "/config");
    expect(settings).toHaveTextContent("");
  });

  it("marks the configuration link when you are on that page", () => {
    render(<AppHeader action={<SettingsLink current />} />);

    expect(screen.getByRole("link", { name: "Configuration" })).toHaveAttribute("aria-current", "page");
  });

  it("puts navigation in a landmark", () => {
    render(<AppHeader action={<SettingsLink />} />);

    expect(screen.getByRole("navigation", { name: /sections/i })).toBeInTheDocument();
  });
});
