"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScatterPlotProps } from "./core";

export type ScatterPlotComponentProps = Partial<ScatterPlotProps> & WrapperProps;

/** Points from JSON on two linear axes, with highlighted points labeled directly beside them and an optional fit line. */
export function ScatterPlot({ className, style, palette, ...props }: ScatterPlotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
