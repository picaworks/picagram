"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiPointerRippleProps } from "./core";

export type AsciiPointerRippleComponentProps = Partial<AsciiPointerRippleProps> & WrapperProps;

/** A field of low-density glyph noise that sends rings outward from the pointer, as if it were water. */
export function AsciiPointerRipple({ className, style, palette, ...props }: AsciiPointerRippleComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
