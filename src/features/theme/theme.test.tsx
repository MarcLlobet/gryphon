import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_KEY } from "./theme";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

const ThemeName = () => <p data-testid="theme">{useTheme().theme}</p>;

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
      <ThemeName />
    </ThemeProvider>,
  );

describe("theme", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "dark";
    window.localStorage.clear();
  });

  it("starts from the theme the inline script put on <html>", () => {
    document.documentElement.dataset.theme = "light";

    renderToggle();

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("switches theme on <html> and remembers the choice", async () => {
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("falls back to dark outside a provider", () => {
    render(<ThemeName />);

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });
});
