"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HammeredFoilProps } from "./core";

export type HammeredFoilComponentProps = Partial<HammeredFoilProps> & WrapperProps;

/** Rounded hammer depressions catch one broad slowly sweeping metallic reflection. */
export function HammeredFoil({ className, style, palette, ...props }: HammeredFoilComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
