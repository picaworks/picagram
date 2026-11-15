"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiOrreryProps } from "./core";

export type AsciiOrreryComponentProps = Partial<AsciiOrreryProps> & WrapperProps;

/** Planet beads travel on connected arms around one inclined braille orrery. */
export function AsciiOrrery({ className, style, palette, ...props }: AsciiOrreryComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
