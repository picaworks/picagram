"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiFretboardProps } from "./core";

export type AsciiFretboardComponentProps = Partial<AsciiFretboardProps> & WrapperProps;

/** A character fretboard that maps tuning pitches into a root-relative scale. */
export function AsciiFretboard({ className, style, palette, ...props }: AsciiFretboardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
