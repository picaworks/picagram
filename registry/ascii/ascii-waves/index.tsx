"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiWavesProps } from "./core";

export type AsciiWavesComponentProps = Partial<AsciiWavesProps> & WrapperProps;

/** Interference between a few drifting circular wave sources, drawn as glyph density. */
export function AsciiWaves({ className, style, palette, ...props }: AsciiWavesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
