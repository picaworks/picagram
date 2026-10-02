"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LollipopChartProps } from "./core";

export type LollipopChartComponentProps = Partial<LollipopChartProps> & WrapperProps;

/** Ranked horizontal rows, each a hairline stem to a dot at its value, drawn as SVG or a monospace glyph grid. */
export function LollipopChart({ className, style, palette, ...props }: LollipopChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
