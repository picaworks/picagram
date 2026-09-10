"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiRevealProps } from "./core";

export type AsciiRevealComponentProps = Partial<AsciiRevealProps> & WrapperProps;

/** Text that cycles through scramble glyphs before settling into its final characters, left to right. */
export function AsciiReveal({ className, style, palette, ...props }: AsciiRevealComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
