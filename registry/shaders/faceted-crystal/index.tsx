"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FacetedCrystalProps } from "./core";

export type FacetedCrystalComponentProps = Partial<FacetedCrystalProps> & WrapperProps;

/** A transparent cut table reveals displaced rules and the lit rear facets of one solid lozenge. */
export function FacetedCrystal({ className, style, palette, ...props }: FacetedCrystalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
