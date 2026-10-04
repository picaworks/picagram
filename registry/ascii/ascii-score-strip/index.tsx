"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiScoreStripProps, type AsciiScoreStripEvents } from "./core";

export type AsciiScoreStripComponentProps = Partial<AsciiScoreStripProps> & WrapperProps & Handlers<AsciiScoreStripEvents>;

/** Character time tracks with selectable performance movements and a readable cue register. */
export function AsciiScoreStrip({ className, style, palette, ...props }: AsciiScoreStripComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
