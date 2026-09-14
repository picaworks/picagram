/** The catalog the site browses: public/catalog.json, written by scripts/build.ts. Never hand-edit that file. */
import { CATEGORIES, CATEGORY_TITLES, FACETS, type Category, type Control, type Facet, type Meta } from "../../lib/meta";
import { TOKENS, type Token } from "../../lib/palette";
import type { Json } from "../../lib/types";
import type { PaletteProp } from "../../lib/use-pica";
import generated from "../../public/catalog.json";

export type { Category, Control, Facet, PaletteProp, Token };
export { CATEGORIES, CATEGORY_TITLES, FACETS, TOKENS };

/** A prop value. Props are plain data by contract, so the inspector can set every one of them, including a
 *  textarea's string, a numbers control's array, or a json control's array or object. */
export type PropValue = Json;
export type Props = Record<string, PropValue>;

/** One catalog entry: the component's meta plus what the build adds to it. */
export interface CatalogItem extends Meta {
  /** The React component's name, for the usage snippet. */
  exportName: string;
  /** The core's defaults. The inspector starts here and reports only what differs. */
  defaults: Props;
  /** Prop name to its JSDoc, shown as the hint under each control. */
  docs: Record<string, string>;
  /** Prop name to its declared TypeScript type, as written in the core. */
  types: Record<string, string>;
  /** Event name to its JSDoc and its detail's declared type. Empty when the component reports none. */
  events: Record<string, { doc: string; detail: string }>;
  /** The vanilla bundle, minified and gzipped, shared runtime included. */
  gzipBytes: number;
}

/** A synthetic item scripts/check-site.ts adds to prove every control type works end to end, including
 *  textarea and json, before any real component uses them. Never present in a normal build: PICA_FIXTURE is
 *  an environment variable that only that script sets, read here at build time since this module runs on
 *  the server that renders the one static page. The check script's own local server answers the requests
 *  this item's slug implies, /v/pica-fixture.html included, so nothing under registry/ or public/ changes. */
const FIXTURE_SLUG = "pica-fixture";

const FIXTURE: CatalogItem = {
  slug: FIXTURE_SLUG,
  title: "Pica Fixture",
  category: "effects",
  description: "A synthetic item scripts/check-site.ts uses to exercise every control type.",
  tags: [],
  facets: ["static", "interactive"],
  wave: 0,
  animated: false,
  decorative: true,
  controls: {
    count: { type: "number", min: 0, max: 10, step: 1 },
    name: { type: "string" },
    note: { type: "textarea", rows: 3 },
    on: { type: "boolean" },
    mode: { type: "select", options: ["a", "b"] },
    tint: { type: "color" },
    series: { type: "numbers" },
    data: { type: "json" },
  },
  credits: [],
  original: true,
  palette: ["fg", "accent"],
  demo: { props: { count: 5 }, children: '<p class="hint" for="x">Hi</p><br>' },
  exportName: "PicaFixture",
  defaults: {
    count: 1,
    name: "hi",
    note: "line one",
    on: false,
    mode: "a",
    tint: "#e8a020",
    series: [1, 2, 3],
    data: { a: 1 },
  },
  docs: {},
  types: {},
  events: { ping: { doc: "Fires when told to, for the site check.", detail: "number" } },
  gzipBytes: 0,
};

const generatedItems = generated as unknown as CatalogItem[];
export const items: readonly CatalogItem[] = process.env.PICA_FIXTURE === "1" ? [...generatedItems, FIXTURE] : generatedItems;

export interface Group {
  category: Category;
  title: string;
  items: CatalogItem[];
}

/** The non-empty categories, in catalog order, each with its items sorted by title. */
export function groupByCategory(list: readonly CatalogItem[]): Group[] {
  return CATEGORIES.map((category) => ({
    category,
    title: CATEGORY_TITLES[category],
    items: list.filter((item) => item.category === category).sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((group) => group.items.length > 0);
}

/** How many items carry each facet. Counted over the whole catalog, so the chips read the same however the
 *  list is filtered and never reflow while someone types. */
export function facetCounts(list: readonly CatalogItem[]): Readonly<Record<Facet, number>> {
  const counts = Object.fromEntries(FACETS.map((facet) => [facet, 0])) as Record<Facet, number>;
  for (const item of list) for (const facet of item.facets) counts[facet] += 1;
  return counts;
}

/** The words the search box reads for one item. Exported so a check can decide what a search will find by
 *  asking the same question the site asks, rather than keeping a second copy of the field list that drifts
 *  away from this one. It takes the fields it reads rather than a whole CatalogItem, so a caller holding
 *  only the catalog's public shape can use it. */
export function searchText(item: {
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly facets: readonly string[];
}): string {
  return [item.title, item.slug, item.description, item.category, ...item.tags, ...item.facets]
    .join(" ")
    .toLowerCase();
}

/** Whether an item survives the search box and the active facet chips. Every active facet must be present, and
 *  the search reads an item's tags and facets as well as its words. */
export function matches(item: CatalogItem, query: string, facets: readonly Facet[]): boolean {
  if (!facets.every((facet) => item.facets.includes(facet))) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = searchText(item);
  return q.split(/\s+/).every((word) => haystack.includes(word));
}
