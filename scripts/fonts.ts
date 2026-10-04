/** Page-owned collection typography. Each preview requests only the faces it uses. */
export interface FontProfile { body: string; serif: string; display: string; }
const GENERAL: FontProfile = { body: "Public Sans", serif: "Fraunces", display: "Anybody" };
const CLASSICAL = ["forum-rome", "botanical-atelier", "repertory-playbill", "museum-acquisition", "monograph-spread"];
const READING = ["homeward-voyage", "margin-journal", "reading-room", "landscape-study", "cartographic-story"];
const GROTESK = ["architect-dossier", "sound-practice", "cinemateque-program", "photo-contact-sheet", "choreographic-score", "observatory-bulletin"];
export function fontProfile(slug: string): FontProfile {
  return { ...GENERAL, body: GROTESK.includes(slug) ? "Space Grotesk" : GENERAL.body, serif: CLASSICAL.includes(slug) ? "Cormorant Garamond" : READING.includes(slug) ? "Newsreader" : GENERAL.serif };
}
export function fontProfileCss(slug: string): string {
  const p = fontProfile(slug);
  return `:root{--pica-font-serif:"${p.serif}",Georgia,serif;--pica-font-display:"${p.display}",system-ui,sans-serif;--pica-font-wide:"${p.display}",system-ui,sans-serif}body{font-family:"${p.body}",system-ui,sans-serif}`;
}
