"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiNoiseFieldProps } from "./core";

export type AsciiNoiseFieldComponentProps = Partial<AsciiNoiseFieldProps> & WrapperProps;

/** A quiet field of drifting simplex noise, drawn as glyphs chosen by measured density. */
export function AsciiNoiseField({ className, style, palette, ...props }: AsciiNoiseFieldComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
