"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MeshGradientProps } from "./core";

export type MeshGradientComponentProps = Partial<MeshGradientProps> & WrapperProps;

/** A slow mesh of accent and ink fields, folded by noise and dithered on the GPU. */
export function MeshGradient({ className, style, palette, ...props }: MeshGradientComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
