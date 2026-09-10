"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BarChartProps } from "./core";

export type BarChartComponentProps = Partial<BarChartProps> & WrapperProps;

/** Vertical bars from labeled values, drawn as SVG or a monospace glyph grid. */
export function BarChart({ className, style, palette, ...props }: BarChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
