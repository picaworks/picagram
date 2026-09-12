"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HeatmapProps } from "./core";

export type HeatmapComponentProps = Partial<HeatmapProps> & WrapperProps;

/** A matrix of values displayed as tone-stepped cells with row and column labels. */
export function Heatmap({ className, style, palette, ...props }: HeatmapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
