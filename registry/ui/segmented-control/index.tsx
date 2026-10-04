"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SegmentedControlEvents, type SegmentedControlProps } from "./core";

export type SegmentedControlComponentProps = Partial<SegmentedControlProps> & Handlers<SegmentedControlEvents> & WrapperProps;

/** A single-choice radio group drawn as one ruled strip, with selection following keyboard focus. */
export function SegmentedControl({ className, style, palette, ...props }: SegmentedControlComponentProps) {
  const ref = usePica<SegmentedControlProps>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
