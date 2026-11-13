/**
 * Light and dark, as data. The palette itself lives in CSS custom properties
 * (globals.css); switching theme only sets `data-theme` on <html>.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "gryphon:theme";

export const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

/**
 * Runs before first paint (inlined in <head>), so a light-theme visitor never sees a
 * dark flash. Order: the saved choice, then the system preference, then dark.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;

export const currentTheme = (): Theme => {
  const value = typeof document === "undefined" ? undefined : document.documentElement.dataset.theme;
  return isTheme(value) ? value : "dark";
};

export const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Blocked storage: the choice holds for this page, then falls back to the system.
  }
};
