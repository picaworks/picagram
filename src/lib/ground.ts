/** The three grounds a live frame can sit on. */

export type Ground = "ink" | "paper" | "checker";

export const GROUNDS: readonly Ground[] = ["ink", "paper", "checker"];

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Sets the ground inside a live frame. The generated page styles `html[data-ground]` itself, so the attribute
 *  is enough. A page generated before those rules existed gets its two colors painted directly instead. */
export function setFrameGround(doc: Document, ground: Ground): void {
  const root = doc.documentElement;
  root.setAttribute("data-ground", ground);
  const styled = [...doc.querySelectorAll("style")].some((style) => (style.textContent ?? "").includes("data-ground"));
  const dark = ground !== "paper";
  for (const el of [root, doc.body]) {
    if (!el) continue;
    el.style.background = styled ? "" : dark ? token("--ink") : token("--paper");
    el.style.color = styled ? "" : dark ? token("--paper") : token("--ink");
  }
}
