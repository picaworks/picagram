"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TimelineChartProps } from "./core";

export type TimelineChartComponentProps = Partial<TimelineChartProps> & WrapperProps;

/** Rows of labeled spans and point events over one shared time axis, for a project plan or a chronology. */
export function TimelineChart({ className, style, palette, ...props }: TimelineChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
