"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BraidedCableProps } from "./core";

export type BraidedCableComponentProps = Partial<BraidedCableProps> & WrapperProps;

/** Cylindrical strand bundles exchange over and under positions along a finite S bend. */
export function BraidedCable({ className, style, palette, ...props }: BraidedCableComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
