"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiPressWireProps } from "./core";
export type AsciiPressWireComponentProps = Partial<AsciiPressWireProps> & WrapperProps;
/** A local wire edition with a character teletype masthead, lead dispatch, timestamped reports and transparent corrections. */
export function AsciiPressWire({ className, style, palette, ...props }: AsciiPressWireComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
