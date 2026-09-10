"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiTerminalProps } from "./core";

export type AsciiTerminalComponentProps = Partial<AsciiTerminalProps> & WrapperProps;

/** A terminal transcript that types its command, prints its output, and rests on a blinking cursor. */
export function AsciiTerminal({ className, style, palette, ...props }: AsciiTerminalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
