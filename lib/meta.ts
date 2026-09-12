/** Catalog metadata for one component. Build-time only: never shipped inside a component. */
import type { Token } from "./palette";
import type { Json } from "./types";

/** Category directories under registry/, in the order the catalog lists them. */
export const CATEGORIES = [
  "ascii",
  "text-mode",
  "dither",
  "effects",
  "patterns",
  "shaders",
  "motion",
  "data",
  "ui",
  "sections",
  "immersive",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** How each category is titled in the catalog, llms.txt, and the registry. */
export const CATEGORY_TITLES: Readonly<Record<Category, string>> = {
  ascii: "ASCII",
  "text-mode": "Text mode",
  dither: "Dither",
  effects: "Effects",
  patterns: "Patterns",
  shaders: "Shaders",
  motion: "Motion",
  data: "Data",
  ui: "UI",
  sections: "Sections",
  immersive: "Immersive",
};

/** The filters the catalog offers, in the order it shows them. This list never grows with the catalog: tags
 *  stay free text, searchable and listed in the inspector, while a facet is one of these twelve and nothing
 *  else, so the filter stays readable at any number of components. test/meta.test.ts decides every facet a
 *  machine can decide, such as animated from `animated` and webgl from the bundle. */
export const FACETS = [
  "animated",
  "static",
  "image",
  "text",
  "background",
  "overlay",
  "interactive",
  "chart",
  "shader",
  "canvas",
  "webgl",
  "dither",
] as const;

export type Facet = (typeof FACETS)[number];

/** How the site's inspector edits one prop. */
export type Control =
  | { type: "number"; min: number; max: number; step: number; label?: string }
  | { type: "string"; label?: string }
  | { type: "textarea"; rows: number; label?: string }
  | { type: "boolean"; label?: string }
  | { type: "select"; options: readonly string[]; label?: string }
  | { type: "color"; label?: string }
  | { type: "numbers"; label?: string }
  | { type: "json"; label?: string };

/** One step of a scripted interaction, which verify runs against both shapes. Selectors are scoped to the
 *  host, and an empty selector means the host itself. Event names are the core's, such as "valueChange". */
export type Step =
  | { step: "press"; key: string }
  | { step: "click"; selector: string }
  | { step: "expectFocus"; selector: string }
  | { step: "expectEvent"; name: string; detail?: Json }
  | { step: "expectAttr"; selector: string; name: string; value: string | null };

export interface Credit {
  /** "port-of" means code was carried over and its license travels with it. The others mean nothing was copied. */
  relation: "port-of" | "inspired-by" | "technique";
  title: string;
  author: string;
  url: string;
  license: string;
}

export interface Meta {
  /** Matches the component's directory name. */
  slug: string;
  title: string;
  /** Matches the parent directory name. */
  category: Category;
  /** One sentence. Shown in the catalog, llms.txt, and the registry. */
  description: string;
  tags: readonly string[];
  /** The catalog filters this component answers to. Exactly one of "animated" and "static". */
  facets: readonly Facet[];
  /** The generation wave that produced it, for the review sheet. */
  wave: number;
  animated: boolean;
  /** Decorative components are aria-hidden, unless they wrap content. Others label themselves from a prop. */
  decorative: boolean;
  /** Inspector controls, keyed by prop name. Every key must exist in the core's defaults. */
  controls: Readonly<Record<string, Control>>;
  /** What this builds on. Empty only when `original` is true. */
  credits: readonly Credit[];
  original?: boolean;
  /** For clean-room components: the spec in specs/ it was built from. */
  spec?: string;
  /** Palette tokens the component draws with, which the inspector offers. Defaults to fg alone. */
  palette?: readonly Token[];
  /** Set when the component takes children. "content" decorates them and never touches them. "panels" treats
   *  each direct child as a panel and may set only role, id, aria-labelledby, and hidden on it. */
  wraps?: "content" | "panels";
  /** Controlled props, each mapped to the event that reports a change to it, such as { value: "valueChange" }. */
  controlled?: Readonly<Record<string, string>>;
  /** Scripted interactions verify runs in both shapes. Each list of steps starts from a fresh mount. */
  interactions?: readonly (readonly Step[])[];
  /** "inline" marks a text run, which the demo page centers and enlarges. Defaults to "fill". */
  stage?: "fill" | "inline";
  /** The host element, when it is not a div (or a span for an inline stage). A button mounts on a real
   *  button, so the browser's own keyboard and form behavior come for free. The React wrapper renders the
   *  same element. */
  host?: "div" | "span" | "button" | "dialog";
  /** Animation time for captures, in milliseconds, when 1200 is not a representative frame. */
  capture?: number;
  /** Props and child markup for captures and the catalog. Never the defaults, which must look finished alone. */
  demo?: { readonly props?: Readonly<Record<string, Json>>; readonly children?: string };
}
