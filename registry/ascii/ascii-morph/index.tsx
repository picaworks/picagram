"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiMorphProps } from "./core";

export type AsciiMorphComponentProps = Partial<AsciiMorphProps> & WrapperProps;

/** Two subjects that morph into each other and back, drawn as measured density glyphs. */
export function AsciiMorph({ className, style, palette, ...props }: AsciiMorphComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
