"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RadioGroupEvents, type RadioGroupProps } from "./core";

export type RadioGroupComponentProps = Partial<RadioGroupProps> & Handlers<RadioGroupEvents> & WrapperProps;

/** A single-choice group with square marks, roving focus, and selection that follows arrow-key focus. */
export function RadioGroup({ className, style, palette, ...props }: RadioGroupComponentProps) {
  const ref = usePica<RadioGroupProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
