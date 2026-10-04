"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ExhibitionLabelsProps } from "./core";

export type ExhibitionLabelsComponentProps = Partial<ExhibitionLabelsProps> & WrapperProps;

/** A gallery catalogue pairing numbered original abstract studies with varied art proportions and curatorial labels. */
export function ExhibitionLabels({ className, style, palette, ...props }: ExhibitionLabelsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
