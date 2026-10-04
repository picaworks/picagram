"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ContourWipeImageProps } from "./core";

export type ContourWipeImageComponentProps = Partial<ContourWipeImageProps> & WrapperProps;

/** Reveal an image through ordered luminance contours, driven by explicit progress. */
export function ContourWipeImage({ className, style, palette, ...props }: ContourWipeImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
