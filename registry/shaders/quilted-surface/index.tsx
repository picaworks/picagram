"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type QuiltedSurfaceProps } from "./core";

export type QuiltedSurfaceComponentProps = Partial<QuiltedSurfaceProps> & WrapperProps;

/** Shallow diamond cushions catch a slow grazing light over fine recessed seams. */
export function QuiltedSurface({ className, style, palette, ...props }: QuiltedSurfaceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
