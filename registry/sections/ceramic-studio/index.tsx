"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CeramicStudioProps } from "./core";

export type CeramicStudioComponentProps = Partial<CeramicStudioProps> & WrapperProps;

/** A ceramic maker collection with original vessel drawings, process notes, and a kiln edition ledger. */
export function CeramicStudio({ className, style, palette, ...props }: CeramicStudioComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
