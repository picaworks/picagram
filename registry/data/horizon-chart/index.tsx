"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HorizonChartProps } from "./core";

export type HorizonChartComponentProps = Partial<HorizonChartProps> & WrapperProps;

/** Signed series folded into comparable density bands, with explicit negative hatching. */
export function HorizonChart({ className, style, palette, ...props }: HorizonChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
