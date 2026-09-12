"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GaugeChartProps } from "./core";

export type GaugeChartComponentProps = Partial<GaugeChartProps> & WrapperProps;

/** One number against its range, drawn as an arc with threshold ticks and the value in the middle. */
export function GaugeChart({ className, style, palette, ...props }: GaugeChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
