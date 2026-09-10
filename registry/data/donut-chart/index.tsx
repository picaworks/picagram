"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DonutChartProps } from "./core";

export type DonutChartComponentProps = Partial<DonutChartProps> & WrapperProps;

/** Parts of a whole drawn as a ring, in an svg or monospace glyph look, with a hidden data table. */
export function DonutChart({ className, style, palette, ...props }: DonutChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
