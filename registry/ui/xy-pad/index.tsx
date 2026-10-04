"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type XyPadEvents, type XyPadProps } from "./core";

export type XyPadComponentProps = Partial<XyPadProps> & Handlers<XyPadEvents> & WrapperProps;

/** A square two-axis pad with a crosshair and a numeric field for each axis. */
export function XyPad({ className, style, palette, ...props }: XyPadComponentProps) {
  const ref = usePica<XyPadProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
