"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ShadowLatticeProps } from "./core";

export type ShadowLatticeComponentProps = Partial<ShadowLatticeProps> & WrapperProps;

/** Shallow crossed ribs cast coherent dithered shadows under a slowly moving grazing light. */
export function ShadowLattice({ className, style, palette, ...props }: ShadowLatticeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
