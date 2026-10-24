"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type StratifiedStoneProps } from "./core";

export type StratifiedStoneComponentProps = Partial<StratifiedStoneProps> & WrapperProps;

/** Broad sediment steps catch moving light across fixed angular breaks. */
export function StratifiedStone({ className, style, palette, ...props }: StratifiedStoneComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
