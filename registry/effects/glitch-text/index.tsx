"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GlitchTextProps } from "./core";

export type GlitchTextComponentProps = Partial<GlitchTextProps> & WrapperProps;

/** A line of text that glitches in short bursts, its strips shifting sideways before it snaps back clean. */
export function GlitchText({ className, style, palette, ...props }: GlitchTextComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
