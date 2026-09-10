"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HalftoneCssProps } from "./core";

export type HalftoneCssComponentProps = Partial<HalftoneCssProps> & WrapperProps;

/** A halftone dot pattern drawn entirely in layered CSS gradients, for use as a background. */
export function HalftoneCss({ className, style, palette, ...props }: HalftoneCssComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
