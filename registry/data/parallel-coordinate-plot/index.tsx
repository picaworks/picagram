"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ParallelCoordinatePlotEvents, type ParallelCoordinatePlotProps } from "./core";

export type ParallelCoordinatePlotComponentProps = Partial<ParallelCoordinatePlotProps> & WrapperProps & Handlers<ParallelCoordinatePlotEvents>;

/** Numeric records traversing independent vertical axes, with direct labels and accessible selection. */
export function ParallelCoordinatePlot({ className, style, palette, ...props }: ParallelCoordinatePlotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
