"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiHelixLadderProps } from "./core";

export type AsciiHelixLadderComponentProps = Partial<AsciiHelixLadderProps> & WrapperProps;

/** Two continuous glyph strands turn around their connecting ladder rungs. */
export function AsciiHelixLadder({ className, style, palette, ...props }: AsciiHelixLadderComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
