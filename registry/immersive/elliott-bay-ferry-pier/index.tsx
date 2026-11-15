"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ElliottBayFerryPierProps } from "./core";

export type ElliottBayFerryPierComponentProps = Partial<ElliottBayFerryPierProps> & WrapperProps;

/** A double ended ferry glides beside a sheltered passenger pier. */
export function ElliottBayFerryPier({ className, style, palette, ...props }: ElliottBayFerryPierComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
