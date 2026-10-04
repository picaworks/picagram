"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiWaveTankProps } from "./core";

export type AsciiWaveTankComponentProps = Partial<AsciiWaveTankProps> & WrapperProps;

/** A shallow-water glyph field with reflecting walls, barriers, and timed impulses. */
export function AsciiWaveTank({ className, style, palette, ...props }: AsciiWaveTankComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
