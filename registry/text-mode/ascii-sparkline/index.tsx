"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiSparklineProps } from "./core";

export type AsciiSparklineComponentProps = Partial<AsciiSparklineProps> & WrapperProps;

/** A series of numbers drawn inline as a sparkline, in eighth-block bars or a braille line. */
export function AsciiSparkline({ className, style, palette, ...props }: AsciiSparklineComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
