"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelWindGroveProps } from "./core";

export type PixelWindGroveComponentProps = Partial<PixelWindGroveProps> & WrapperProps;

/** An old grove bends its broad boughs above a finite mossy root plate. */
export function PixelWindGrove({ className, style, palette, ...props }: PixelWindGroveComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
