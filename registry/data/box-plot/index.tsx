"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BoxPlotProps } from "./core";

export type BoxPlotComponentProps = Partial<BoxPlotProps> & WrapperProps;

/** The spread of several groups on one value axis: quartile boxes, a median tick, whiskers, and outliers. */
export function BoxPlot({ className, style, palette, ...props }: BoxPlotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
