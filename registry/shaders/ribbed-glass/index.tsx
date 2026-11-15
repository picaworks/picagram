"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RibbedGlassProps } from "./core";

export type RibbedGlassComponentProps = Partial<RibbedGlassProps> & WrapperProps;

/** Rounded glass ribs and a rolled slab edge reveal a quiet locally refracted grid. */
export function RibbedGlass({ className, style, palette, ...props }: RibbedGlassComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
