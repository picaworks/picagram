"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiDiffractionScreenProps } from "./core";

export type AsciiDiffractionScreenComponentProps = Partial<AsciiDiffractionScreenProps> & WrapperProps;

/** An analytic glyph illustration of two openings and a coherent fringe screen. */
export function AsciiDiffractionScreen({ className, style, palette, ...props }: AsciiDiffractionScreenComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
