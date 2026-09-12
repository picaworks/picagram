"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherRevealProps } from "./core";

export type DitherRevealComponentProps = Partial<DitherRevealProps> & WrapperProps;

/** A photograph that dissolves in and out as a thickening halftone, its dots joining in blue noise order. */
export function DitherReveal({ className, style, palette, ...props }: DitherRevealComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
