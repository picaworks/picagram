"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type OrbitingHalftoneProps } from "./core";

export type OrbitingHalftoneComponentProps = Partial<OrbitingHalftoneProps> & WrapperProps;

/** Three printed discs drift over a fixed halftone screen. */
export function OrbitingHalftone({ className, style, palette, ...props }: OrbitingHalftoneComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
