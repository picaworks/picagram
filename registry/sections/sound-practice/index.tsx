"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SoundPracticeProps } from "./core";

export type SoundPracticeComponentProps = Partial<SoundPracticeProps> & WrapperProps;

/** A sound designer portfolio with original waveform scores, project timelines, and listening annotations. */
export function SoundPractice({ className, style, palette, ...props }: SoundPracticeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
