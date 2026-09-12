/** The page's theme: which of the two grounds the chrome itself wears. The choice is saved, and a system that
 *  asks for light gets light. No React here, so a test can import this module and run THEME_SCRIPT on its own. */
import type { Ground } from "./ground";

export type Theme = "dark" | "light";

/** The two buttons of the Theme control, in the order it shows them. */
export const THEMES: readonly Theme[] = ["dark", "light"];

/** Where the choice is kept. The value is the theme's own name. */
export const THEME_KEY = "picagram-theme";

/** The ground a theme starts the canvas on, so a light page opens on light captures. The manual Ground control
 *  can move it afterwards. */
export const THEME_GROUND: Readonly<Record<Theme, Ground>> = { dark: "ink", light: "paper" };

/** Reads the saved theme, falls back to the system's, and sets data-theme on the document element. It must
 *  stay self-contained: THEME_SCRIPT serializes this function into the page head, where nothing else exists. */
export function markTheme(key: string): Theme {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(key);
  } catch {
    // A browser with storage blocked follows its system setting instead.
  }
  let theme: Theme;
  if (saved === "dark" || saved === "light") theme = saved;
  else if (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches) theme = "light";
  else theme = "dark";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

/** markTheme as one statement the browser runs while it parses the head, before it paints anything. */
export const THEME_SCRIPT = `(${markTheme.toString()})(${JSON.stringify(THEME_KEY)});`;

/** Applies a chosen theme and remembers it. The attribute goes on first, so a browser that refuses storage
 *  still changes theme. */
export function saveTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The choice lasts for this page only.
  }
}
