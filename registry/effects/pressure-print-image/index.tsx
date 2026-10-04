"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PressurePrintImageProps } from "./core";

export type PressurePrintImageComponentProps = Partial<PressurePrintImageProps> & WrapperProps;

/** A local pressure impression deposits an image as a stable monochrome halftone. */
export function PressurePrintImage({ className, style, palette, ...props }: PressurePrintImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
