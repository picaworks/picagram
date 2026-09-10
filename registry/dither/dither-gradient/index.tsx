"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherGradientProps } from "./core";

export type DitherGradientComponentProps = Partial<DitherGradientProps> & WrapperProps;

/** A two-tone gradient dithered through a Bayer matrix, its tone carried by dot density alone. */
export function DitherGradient({ className, style, palette, ...props }: DitherGradientComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
