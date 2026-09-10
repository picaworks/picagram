"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiTextProps } from "./core";

export type AsciiTextComponentProps = Partial<AsciiTextProps> & WrapperProps;

/** A headline set in a display face, then redrawn as a grid of glyphs chosen by measured ink and shape. */
export function AsciiText({ className, style, palette, ...props }: AsciiTextComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
