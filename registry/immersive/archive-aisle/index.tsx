"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ArchiveAisleProps } from "./core";

export type ArchiveAisleComponentProps = Partial<ArchiveAisleProps> & WrapperProps;

/** An original spatial collection route with a readable linear register. */
export function ArchiveAisle({ className, style, palette, ...props }: ArchiveAisleComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
