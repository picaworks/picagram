"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiGyroscopeProps } from "./core";

export type AsciiGyroscopeComponentProps = Partial<AsciiGyroscopeProps> & WrapperProps;

/** Three inclined glyph wire rings precess around a fixed center. */
export function AsciiGyroscope({ className, style, palette, ...props }: AsciiGyroscopeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
