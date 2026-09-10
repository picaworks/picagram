"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type StatsKpiProps } from "./core";

export type StatsKpiComponentProps = Partial<StatsKpiProps> & WrapperProps;

/** A row of key numbers, each counting up once with a delta glyph and an inline trend sparkline. */
export function StatsKpi({ className, style, palette, ...props }: StatsKpiComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
