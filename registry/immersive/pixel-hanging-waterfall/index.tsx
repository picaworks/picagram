"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelHangingWaterfallProps } from "./core";

export type PixelHangingWaterfallComponentProps = Partial<PixelHangingWaterfallProps> & WrapperProps;

/** A connected stepped stream falls from a rock ledge into a finite basin. */
export function PixelHangingWaterfall({ className, style, palette, ...props }: PixelHangingWaterfallComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
