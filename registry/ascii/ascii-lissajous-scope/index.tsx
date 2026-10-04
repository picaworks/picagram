"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiLissajousScopeProps } from "./core";

export type AsciiLissajousScopeComponentProps = Partial<AsciiLissajousScopeProps> & WrapperProps;

/** A measured glyph oscilloscope with an analytic persistence trail and X-phase landmarks. */
export function AsciiLissajousScope({ className, style, palette, ...props }: AsciiLissajousScopeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
