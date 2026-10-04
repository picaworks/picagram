"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RangeBrushEvents, type RangeBrushProps } from "./core";

export type RangeBrushComponentProps = Partial<RangeBrushProps> & Handlers<RangeBrushEvents> & WrapperProps;

/** A two-handle numeric interval brush with ordered pointer and keyboard input. */
export function RangeBrush({ className, style, palette, ...props }: RangeBrushComponentProps) {
  const ref = usePica<RangeBrushProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
