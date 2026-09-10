"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LineChartProps } from "./core";

export type LineChartComponentProps = Partial<LineChartProps> & WrapperProps;

/** One or more series plotted as lines over a shared set of labels, in an svg or braille glyph look. */
export function LineChart({ className, style, palette, ...props }: LineChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
