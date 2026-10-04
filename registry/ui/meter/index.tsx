"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MeterProps } from "./core";

export type MeterComponentProps = Partial<MeterProps> & WrapperProps;

/** A labelled scalar readout drawn as a quiet row of block cells with an optional threshold marker. */
export function Meter({ className, style, palette, ...props }: MeterComponentProps) {
  const ref = usePica<MeterProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
