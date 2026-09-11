import type { NextConfig } from "next";
import { BASE_PATH } from "./scripts/config";

/** Fully static: the catalog, the markdown twins, and the registry are files, not endpoints. A production build
 *  is served under BASE_PATH, the way GitHub Pages serves it, and the dev server stays at the root. The page
 *  links to its own files with relative paths, so only Next's assets need the prefix. */
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.NODE_ENV === "production" ? BASE_PATH : "",
};

export default config;
