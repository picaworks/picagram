import type { NextConfig } from "next";

/** Fully static: the catalog, the markdown twins, and the registry are files, not endpoints. */
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default config;
