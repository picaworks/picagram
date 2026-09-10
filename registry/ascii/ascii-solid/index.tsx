"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiSolidProps } from "./core";

export type AsciiSolidComponentProps = Partial<AsciiSolidProps> & WrapperProps;

/** A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp. */
export function AsciiSolid({ className, style, palette, ...props }: AsciiSolidComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
