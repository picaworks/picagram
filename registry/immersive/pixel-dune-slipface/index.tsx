"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelDuneSlipfaceProps } from "./core";

export type PixelDuneSlipfaceComponentProps = Partial<PixelDuneSlipfaceProps> & WrapperProps;

/** Short broad sand releases slide down a low dune into a sheltered receiving apron. */
export function PixelDuneSlipface({ className, style, palette, ...props }: PixelDuneSlipfaceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
