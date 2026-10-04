"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TernaryPlotEvents, type TernaryPlotProps } from "./core";

export type TernaryPlotComponentProps = Partial<TernaryPlotProps> & WrapperProps & Handlers<TernaryPlotEvents>;

/** Three normalized proportions on a triangular chart, with direct sample labels and keyboard selection. */
export function TernaryPlot({ className, style, palette, ...props }: TernaryPlotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
