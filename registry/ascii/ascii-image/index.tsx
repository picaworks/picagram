"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiImageProps } from "./core";

export type AsciiImageComponentProps = Partial<AsciiImageProps> & WrapperProps;

/** An image drawn as a grid of glyphs, each chosen by the ink it puts down in the font in use. */
export function AsciiImage({ className, style, palette, ...props }: AsciiImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
