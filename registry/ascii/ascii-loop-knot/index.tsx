"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiLoopKnotProps } from "./core";

export type AsciiLoopKnotComponentProps = Partial<AsciiLoopKnotProps> & WrapperProps;

/** A continuous braille loop with clear crossings and a slow spatial turn. */
export function AsciiLoopKnot({ className, style, palette, ...props }: AsciiLoopKnotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
