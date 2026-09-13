"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelPlasmaProps } from "./core";

export type PixelPlasmaComponentProps = Partial<PixelPlasmaProps> & WrapperProps;

/** The demoscene plasma drawn as a coarse printed screen, dithered between two palette tones. */
export function PixelPlasma({ className, style, palette, ...props }: PixelPlasmaComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
