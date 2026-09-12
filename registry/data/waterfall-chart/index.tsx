"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WaterfallChartProps } from "./core";

export type WaterfallChartComponentProps = Partial<WaterfallChartProps> & WrapperProps;

/** Bars showing changes between running totals, with connectors, drawn as SVG or a monospace glyph grid. */
export function WaterfallChart({ className, style, palette, ...props }: WaterfallChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
