"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CityAtlasProps } from "./core";

export type CityAtlasComponentProps = Partial<CityAtlasProps> & WrapperProps;

/** An urban publication with an original block map, address index and district narratives. */
export function CityAtlas({ className, style, palette, ...props }: CityAtlasComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
