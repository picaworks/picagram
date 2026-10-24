"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiStringModesProps } from "./core";

export type AsciiStringModesComponentProps = Partial<AsciiStringModesProps> & WrapperProps;

/** Three anchored glyph strings reveal consecutive standing modes. */
export function AsciiStringModes({ className, style, palette, ...props }: AsciiStringModesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
