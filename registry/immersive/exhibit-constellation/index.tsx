"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ExhibitConstellationProps } from "./core";

export type ExhibitConstellationComponentProps = Partial<ExhibitConstellationProps> & WrapperProps;

/** An original spatial object route with a readable linear register. */
export function ExhibitConstellation({ className, style, palette, ...props }: ExhibitConstellationComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
