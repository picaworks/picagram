"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WatershedWalkProps } from "./core";

export type WatershedWalkComponentProps = Partial<WatershedWalkProps> & WrapperProps;

/** An original spatial station route with a readable linear register. */
export function WatershedWalk({ className, style, palette, ...props }: WatershedWalkComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
