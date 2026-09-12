"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherNoiseProps } from "./core";

export type DitherNoiseComponentProps = Partial<DitherNoiseProps> & WrapperProps;

/** A field of fractal noise screened into flat tone bands, drifting slowly like weather on a printed map. */
export function DitherNoise({ className, style, palette, ...props }: DitherNoiseComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
