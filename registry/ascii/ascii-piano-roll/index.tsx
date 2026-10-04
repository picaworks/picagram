"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiPianoRollEvents, type AsciiPianoRollProps } from "./core";

export type AsciiPianoRollComponentProps = Partial<AsciiPianoRollProps> & WrapperProps & Handlers<AsciiPianoRollEvents>;

/** A selectable monospace note roll whose supplied pitches and durations occupy musical grid cells. */
export function AsciiPianoRoll({ className, style, palette, ...props }: AsciiPianoRollComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
