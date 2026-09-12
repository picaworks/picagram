"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherContoursProps } from "./core";

export type DitherContoursComponentProps = Partial<DitherContoursProps> & WrapperProps;

/** A drifting noise field cut into hypsometric bands of flat dither tone, like a printed relief map. */
export function DitherContours({ className, style, palette, ...props }: DitherContoursComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
