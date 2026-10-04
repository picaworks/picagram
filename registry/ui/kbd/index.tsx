"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type KbdProps } from "./core";

export type KbdComponentProps = Partial<KbdProps> & WrapperProps;

/** A keyboard chord drawn as physical key caps or bracketed monospace text. */
export function Kbd({ className, style, palette, ...props }: KbdComponentProps) {
  const ref = usePica<KbdProps, HTMLSpanElement>(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
