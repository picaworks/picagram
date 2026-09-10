/** Catalog metadata for one component. Build-time only: never shipped inside a component. */

export type Category = "ascii" | "text-mode" | "dither" | "effects" | "patterns";

/** How the site's inspector edits one prop. */
export type Control =
  | { type: "number"; min: number; max: number; step: number; label?: string }
  | { type: "string"; label?: string }
  | { type: "boolean"; label?: string }
  | { type: "select"; options: readonly string[]; label?: string }
  | { type: "color"; label?: string }
  | { type: "numbers"; label?: string };

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
  /** The generation wave that produced it, for the review sheet. */
  wave: number;
  animated: boolean;
  /** Decorative components are aria-hidden. Others label themselves from a prop. */
  decorative: boolean;
  /** Inspector controls, keyed by prop name. Every key must exist in the core's defaults. */
  controls: Readonly<Record<string, Control>>;
  /** What this builds on. Empty only when `original` is true. */
  credits: readonly Credit[];
  original?: boolean;
  /** For clean-room components: the spec in specs/ it was built from. */
  spec?: string;
}
