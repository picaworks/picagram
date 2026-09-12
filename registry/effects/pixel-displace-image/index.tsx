"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelDisplaceImageProps } from "./core";

export type PixelDisplaceImageComponentProps = Partial<PixelDisplaceImageProps> & WrapperProps;

/** A photograph sheared into horizontal bands that slide sideways on a slow noise field, like a printout pulled crooked. */
export function PixelDisplaceImage({ className, style, palette, ...props }: PixelDisplaceImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
