"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiRainProps } from "./core";

export type AsciiRainComponentProps = Partial<AsciiRainProps> & WrapperProps;

/** Columns of glyphs falling at their own speed, each with a bright head and a trail that fades down the ramp. */
export function AsciiRain({ className, style, palette, ...props }: AsciiRainComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
