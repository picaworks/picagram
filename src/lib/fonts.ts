/** Page-owned preview typography. Component exports retain portable system fallbacks. */
import { fontProfile } from "../../scripts/fonts";
export const PREVIEW_FONTS = ["Collection", "Page font", "Fraunces", "Newsreader", "Cormorant Garamond", "Public Sans", "Space Grotesk", "Anybody"] as const;
export type PreviewFont = typeof PREVIEW_FONTS[number];
export function setPreviewFont(doc: Document, choice: PreviewFont, collection: boolean, slug: string): void {
  // The iframe exists before its src finishes loading. onLoad paints the real page later.
  if (doc.location.protocol === "about:") return;
  const enabled = choice !== "Page font" && (choice !== "Collection" || collection);
  let sheet = doc.querySelector<HTMLLinkElement>("link[data-pica-fonts]");
  if (enabled && !sheet) {
    sheet = doc.createElement("link"); sheet.rel = "stylesheet"; sheet.dataset.picaFonts = "";
    sheet.href = new URL("../fonts/fonts.css", doc.location.href).href; doc.head.append(sheet);
  }
  if (!enabled) sheet?.remove();
  const profile = fontProfile(slug);
  for (const token of ["serif", "display", "wide"] as const) {
    if (!enabled) doc.documentElement.style.removeProperty(`--pica-font-${token}`);
    else doc.documentElement.style.setProperty(`--pica-font-${token}`, `"${choice === "Collection" ? token === "serif" ? profile.serif : profile.display : choice}", ${token === "serif" ? "Georgia,serif" : "system-ui,sans-serif"}`);
  }
  doc.body.style.fontFamily = enabled ? `"${choice === "Collection" ? profile.body : choice}", system-ui, sans-serif` : "";
}
