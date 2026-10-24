"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiMobiusBandProps } from "./core";

export type AsciiMobiusBandComponentProps = Partial<AsciiMobiusBandProps> & WrapperProps;

/** A shaded glyph ribbon reveals one continuous half twist. */
export function AsciiMobiusBand({ className, style, palette, ...props }: AsciiMobiusBandComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
