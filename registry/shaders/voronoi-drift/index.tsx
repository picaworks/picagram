"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type VoronoiDriftProps } from "./core";

export type VoronoiDriftComponentProps = Partial<VoronoiDriftProps> & WrapperProps;

/** A plane of dithered territories around drifting sites, separated by fg hairlines. */
export function VoronoiDrift({ className, style, palette, ...props }: VoronoiDriftComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
