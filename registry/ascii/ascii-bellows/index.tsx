"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiBellowsProps } from "./core";

export type AsciiBellowsComponentProps = Partial<AsciiBellowsProps> & WrapperProps;

/** Connected braille pleats expand between two square end plates. */
export function AsciiBellows({ className, style, palette, ...props }: AsciiBellowsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
