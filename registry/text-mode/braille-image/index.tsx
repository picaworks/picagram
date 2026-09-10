"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BrailleImageProps } from "./core";

export type BrailleImageComponentProps = Partial<BrailleImageProps> & WrapperProps;

/** An image drawn with braille dot patterns, at four times the vertical resolution of a plain glyph ramp. */
export function BrailleImage({ className, style, palette, ...props }: BrailleImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
