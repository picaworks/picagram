"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MuseumAcquisitionProps } from "./core";

export type MuseumAcquisitionComponentProps = Partial<MuseumAcquisitionProps> & WrapperProps;

/** A museum accession record with original object drawings, a provenance timeline, and expandable conservation notes. */
export function MuseumAcquisition({ className, style, palette, ...props }: MuseumAcquisitionComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
