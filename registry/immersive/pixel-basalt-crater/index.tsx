"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelBasaltCraterProps } from "./core";

export type PixelBasaltCraterComponentProps = Partial<PixelBasaltCraterProps> & WrapperProps;

/** Three broad crust rafts circulate inside a broken hollow basalt crater. */
export function PixelBasaltCrater({ className, style, palette, ...props }: PixelBasaltCraterComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
