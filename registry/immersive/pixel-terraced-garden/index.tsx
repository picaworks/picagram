"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelTerracedGardenProps } from "./core";

export type PixelTerracedGardenComponentProps = Partial<PixelTerracedGardenProps> & WrapperProps;

/** Three planted terraces share a connected irrigation route and lower catch basin. */
export function PixelTerracedGarden({ className, style, palette, ...props }: PixelTerracedGardenComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
