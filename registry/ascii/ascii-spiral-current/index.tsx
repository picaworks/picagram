"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiSpiralCurrentProps } from "./core";

export type AsciiSpiralCurrentComponentProps = Partial<AsciiSpiralCurrentProps> & WrapperProps;

/** Broad measured glyph ribbons spiral around an open center. */
export function AsciiSpiralCurrent({ className, style, palette, ...props }: AsciiSpiralCurrentComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
