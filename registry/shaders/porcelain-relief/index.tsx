"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PorcelainReliefProps } from "./core";

export type PorcelainReliefComponentProps = Partial<PorcelainReliefProps> & WrapperProps;

/** Raised terraced shoulders and quiet flutes lead to one solid porcelain boss. */
export function PorcelainRelief({ className, style, palette, ...props }: PorcelainReliefComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
