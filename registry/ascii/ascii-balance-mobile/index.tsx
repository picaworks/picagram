"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiBalanceMobileProps } from "./core";

export type AsciiBalanceMobileComponentProps = Partial<AsciiBalanceMobileProps> & WrapperProps;

/** An asymmetric suspended mobile sways through connected levels of glyph rods. */
export function AsciiBalanceMobile({ className, style, palette, ...props }: AsciiBalanceMobileComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
