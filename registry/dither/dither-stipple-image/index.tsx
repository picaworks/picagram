"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherStippleImageProps } from "./core";

export type DitherStippleImageComponentProps = Partial<DitherStippleImageProps> & WrapperProps;

/** A photograph redrawn as round dots of one size, spaced by a blue noise mask so density alone carries the tone. */
export function DitherStippleImage({ className, style, palette, ...props }: DitherStippleImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
