"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CityGridProps } from "./core";

export type CityGridComponentProps = Partial<CityGridProps> & WrapperProps;

/** A seeded city of blocks on a street grid, seen from above and panning slowly along one street axis. */
export function CityGrid({ className, style, palette, ...props }: CityGridComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
