"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelSortProps } from "./core";

export type PixelSortComponentProps = Partial<PixelSortProps> & WrapperProps;

/** An image with its rows or columns sorted by brightness into smeared bands. */
export function PixelSort({ className, style, palette, ...props }: PixelSortComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
