"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelTidalShelfProps } from "./core";

export type PixelTidalShelfComponentProps = Partial<PixelTidalShelfProps> & WrapperProps;

/** A connected tide fills and drains exposed pools in a thick coastal rock shelf. */
export function PixelTidalShelf({ className, style, palette, ...props }: PixelTidalShelfComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
