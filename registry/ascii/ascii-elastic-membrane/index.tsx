"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiElasticMembraneProps } from "./core";

export type AsciiElasticMembraneComponentProps = Partial<AsciiElasticMembraneProps> & WrapperProps;

/** A pinned glyph lattice carries smooth standing waves in perspective. */
export function AsciiElasticMembrane({ className, style, palette, ...props }: AsciiElasticMembraneComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
