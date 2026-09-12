"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherCrosshatchImageProps } from "./core";

export type DitherCrosshatchImageComponentProps = Partial<DitherCrosshatchImageProps> & WrapperProps;

/** An image drawn in crossing pen strokes, each layer switching on as the tone beneath it darkens. */
export function DitherCrosshatchImage({ className, style, palette, ...props }: DitherCrosshatchImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
