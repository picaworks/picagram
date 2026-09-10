/** The catalog the site browses: public/catalog.json, written by scripts/build.ts. Never hand-edit that file. */
import type { Category, Control, Meta } from "../../lib/meta";
import generated from "../../public/catalog.json";

export type { Category, Control };

/** A prop value. Props are plain data by contract, so the inspector can set every one of them. */
export type PropValue = string | number | boolean | null | number[];
export type Props = Record<string, PropValue>;

/** One catalog entry: the component's meta plus what the build adds to it. */
export interface CatalogItem extends Meta {
  /** The React component's name, for the usage snippet. */
  exportName: string;
  /** The core's defaults. The inspector starts here and reports only what differs. */
  defaults: Props;
  /** Prop name to its JSDoc, shown as the hint under each control. */
  docs: Record<string, string>;
  /** The vanilla bundle, minified and gzipped, shared runtime included. */
  gzipBytes: number;
}

export const items: readonly CatalogItem[] = generated as unknown as CatalogItem[];

export const CATEGORIES: readonly Category[] = ["ascii", "text-mode", "dither", "effects", "patterns"];

export const CATEGORY_TITLES: Readonly<Record<Category, string>> = {
  ascii: "ASCII",
  "text-mode": "Text mode",
  dither: "Dither",
  effects: "Effects",
  patterns: "Patterns",
};

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

/** Every tag in use, most common first, then alphabetical. */
export function allTags(list: readonly CatalogItem[]): string[] {
  const counts = new Map<string, number>();
  for (const item of list) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}

/** Whether an item survives the search box and the active tag chips. Every active tag must be present. */
export function matches(item: CatalogItem, query: string, tags: readonly string[]): boolean {
  if (!tags.every((tag) => item.tags.includes(tag))) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.title, item.slug, item.description, item.category, ...item.tags].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}
