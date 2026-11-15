"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HoneycombCoreProps } from "./core";

export type HoneycombCoreComponentProps = Partial<HoneycombCoreProps> & WrapperProps;

/** A finite cut honeycomb slab exposes open hexagonal cells and their interior walls. */
export function HoneycombCore({ className, style, palette, ...props }: HoneycombCoreComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
