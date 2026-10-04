"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelWeftImageProps } from "./core";

export type PixelWeftImageComponentProps = Partial<PixelWeftImageProps> & WrapperProps;

/** Source-image rows and columns weave through alternating over-and-under crossings. */
export function PixelWeftImage({ className, style, palette, ...props }: PixelWeftImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
