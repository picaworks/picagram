"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WorldMapProps } from "./core";

export type WorldMapComponentProps = Partial<WorldMapProps> & WrapperProps;

/** A world map on the Equal Earth projection, its land an even grid of dots with named places marked. */
export function WorldMap({ className, style, palette, ...props }: WorldMapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
