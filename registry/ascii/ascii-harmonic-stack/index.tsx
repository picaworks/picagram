"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiHarmonicStackProps } from "./core";

export type AsciiHarmonicStackComponentProps = Partial<AsciiHarmonicStackProps> & WrapperProps;

/** Offset harmonic profiles form a quiet bank of measured glyphs. */
export function AsciiHarmonicStack({ className, style, palette, ...props }: AsciiHarmonicStackComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
