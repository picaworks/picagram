"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScanBeamProps } from "./core";

export type ScanBeamComponentProps = Partial<ScanBeamProps> & WrapperProps;

/** A radar plan position display: an accent beam sweeping hairline rings and spokes, with seeded echoes. */
export function ScanBeam({ className, style, palette, ...props }: ScanBeamComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
