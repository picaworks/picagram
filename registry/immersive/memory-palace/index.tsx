"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MemoryPalaceProps } from "./core";

export type MemoryPalaceComponentProps = Partial<MemoryPalaceProps> & WrapperProps;

/** An original spatial room route with a readable linear register. */
export function MemoryPalace({ className, style, palette, ...props }: MemoryPalaceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
