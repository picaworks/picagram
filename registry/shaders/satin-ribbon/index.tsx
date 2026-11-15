"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SatinRibbonProps } from "./core";

export type SatinRibbonComponentProps = Partial<SatinRibbonProps> & WrapperProps;

/** A wide folded satin ribbon turns its lengthwise fiber sheen under one slow light. */
export function SatinRibbon({ className, style, palette, ...props }: SatinRibbonComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
