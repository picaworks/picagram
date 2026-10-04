"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FanChartProps } from "./core";

export type FanChartComponentProps = Partial<FanChartProps> & WrapperProps;

/** A central series and supplied uncertainty envelopes rendered as an accessible forecast fan. */
export function FanChart({ className, style, palette, ...props }: FanChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
