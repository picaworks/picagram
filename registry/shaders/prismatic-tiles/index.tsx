"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PrismaticTilesProps } from "./core";

export type PrismaticTilesComponentProps = Partial<PrismaticTilesProps> & WrapperProps;

/** Rhombic bevel facets share one slowly moving light and a fine printed grain. */
export function PrismaticTiles({ className, style, palette, ...props }: PrismaticTilesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
