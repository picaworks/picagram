"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiScrewConveyorProps } from "./core";

export type AsciiScrewConveyorComponentProps = Partial<AsciiScrewConveyorProps> & WrapperProps;

/** Broad screw flights carry small loads along a finite diagonal shaft. */
export function AsciiScrewConveyor({ className, style, palette, ...props }: AsciiScrewConveyorComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
