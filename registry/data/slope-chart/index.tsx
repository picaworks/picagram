"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SlopeChartProps } from "./core";

export type SlopeChartComponentProps = Partial<SlopeChartProps> & WrapperProps;

/** Two periods on two vertical axes with one straight line per item, labelled at both ends, in an svg or braille glyph look. */
export function SlopeChart({ className, style, palette, ...props }: SlopeChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
