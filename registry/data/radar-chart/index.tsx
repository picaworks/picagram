"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RadarChartProps } from "./core";

export type RadarChartComponentProps = Partial<RadarChartProps> & WrapperProps;

/** Three to eight axes radiating from a centre with closed polygon series, drawn as SVG or a monospace glyph grid. */
export function RadarChart({ className, style, palette, ...props }: RadarChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
