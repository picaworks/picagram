"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherTemporalProps } from "./core";

export type DitherTemporalComponentProps = Partial<DitherTemporalProps> & WrapperProps;

/** A still sphere or gradient whose ordered dither screen renews its grain each frame while the tone holds. */
export function DitherTemporal({ className, style, palette, ...props }: DitherTemporalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
