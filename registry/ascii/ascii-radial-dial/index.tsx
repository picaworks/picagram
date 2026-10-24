"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiRadialDialProps } from "./core";

export type AsciiRadialDialComponentProps = Partial<AsciiRadialDialProps> & WrapperProps;

/** Broken concentric glyph rings turn slowly around a clear circular opening. */
export function AsciiRadialDial({ className, style, palette, ...props }: AsciiRadialDialComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
