"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiCellularTapeProps } from "./core";

export type AsciiCellularTapeComponentProps = Partial<AsciiCellularTapeProps> & WrapperProps;

/** An elementary cellular automaton unfolding into a numbered ASCII rule tape. */
export function AsciiCellularTape({ className, style, palette, ...props }: AsciiCellularTapeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
