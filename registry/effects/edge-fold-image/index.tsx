"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EdgeFoldImageProps } from "./core";

export type EdgeFoldImageComponentProps = Partial<EdgeFoldImageProps> & WrapperProps;

/** A monochrome image with one edge rotated around a crease into a perspective fold. */
export function EdgeFoldImage({ className, style, palette, ...props }: EdgeFoldImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
