"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RippleFieldProps } from "./core";

export type RippleFieldComponentProps = Partial<RippleFieldProps> & WrapperProps;

/** Rings spread from seeded drops on a still surface, interfering and fading, dithered on the GPU. */
export function RippleField({ className, style, palette, ...props }: RippleFieldComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
