"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherImageProps } from "./core";

export type DitherImageComponentProps = Partial<DitherImageProps> & WrapperProps;

/** An image reduced to two tones by dithering, drawn crisp on a canvas at a chosen pixel scale. */
export function DitherImage({ className, style, palette, ...props }: DitherImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
