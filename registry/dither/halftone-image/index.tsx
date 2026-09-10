"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HalftoneImageProps } from "./core";

export type HalftoneImageComponentProps = Partial<HalftoneImageProps> & WrapperProps;

/** An image screened into halftone dots, squares, or lines, drawn on a canvas in the host's ink color. */
export function HalftoneImage({ className, style, palette, ...props }: HalftoneImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
