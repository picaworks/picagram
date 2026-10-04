/** Explicit catalog collection metadata. Storage categories and component URLs stay unchanged. */
export const FULL_SITE_SLUGS = [
  "architect-dossier", "archive-finding-aid", "botanical-atelier", "cartographic-story",
  "ceramic-studio", "choreographic-score", "cinemateque-program", "city-atlas",
  "conservation-report", "culinary-notebook", "desert-transmission", "exhibition-labels",
  "fashion-lookbook", "festival-route", "field-dispatch", "folio-index", "forum-rome",
  "homeward-voyage", "landscape-study", "letterpress-broadside", "margin-journal",
  "material-library", "monograph-spread", "museum-acquisition", "nocturne-film",
  "observatory-bulletin", "oral-history", "orbital-log", "photo-contact-sheet",
  "polar-expedition", "public-lecture", "reading-room", "repertory-playbill",
  "sound-practice", "specimen-review", "type-foundry",
  "ascii-campus-directory", "ascii-expedition-log", "ascii-folio-ledger",
  "ascii-library-catalog", "ascii-observatory-console", "ascii-press-wire",
  "ascii-release-room", "ascii-terminal-journal", "ascii-workshop-index",
] as const;

const fullSiteSlugs: ReadonlySet<string> = new Set(FULL_SITE_SLUGS);
export function isFullSite(slug: string): boolean { return fullSiteSlugs.has(slug); }
