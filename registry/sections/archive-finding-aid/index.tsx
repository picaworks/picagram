"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ArchiveFindingAidProps } from "./core";

export type ArchiveFindingAidComponentProps = Partial<ArchiveFindingAidProps> & WrapperProps;

/** An institutional finding aid with a collection identifier, arrangement tree, and expandable series descriptions. */
export function ArchiveFindingAid({ className, style, palette, ...props }: ArchiveFindingAidComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
