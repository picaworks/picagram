"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiCatenaryNetProps } from "./core";

export type AsciiCatenaryNetComponentProps = Partial<AsciiCatenaryNetProps> & WrapperProps;

/** A suspended braille net carries a small travelling wave between fixed posts. */
export function AsciiCatenaryNet({ className, style, palette, ...props }: AsciiCatenaryNetComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
