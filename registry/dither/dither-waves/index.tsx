"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherWavesProps } from "./core";

export type DitherWavesComponentProps = Partial<DitherWavesProps> & WrapperProps;

/** Wave trains crossing at different angles, their interference screened into a moire lattice. */
export function DitherWaves({ className, style, palette, ...props }: DitherWavesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
