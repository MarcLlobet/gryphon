"use client";

/**
 * The theme lives on <html data-theme>, set before first paint by an inline script.
 * React reads it from there as an external store instead of keeping a copy, so the
 * two can never disagree.
 */
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { applyTheme, currentTheme, type Theme } from "./theme";

interface ThemeState {
  readonly theme: Theme;
  readonly toggle: () => void;
}

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setTheme = (theme: Theme) => {
  applyTheme(theme);
  listeners.forEach((listener) => listener());
};

const ThemeContext = createContext<ThemeState | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // The static render cannot know the theme, so it assumes dark, like the markup.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "dark" as const);
  const value = useMemo(() => ({ theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** Dark and inert outside a provider, so components stay usable on their own and in tests. */
export const useTheme = (): ThemeState => useContext(ThemeContext) ?? { theme: "dark", toggle: () => {} };
