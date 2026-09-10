"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiLoaderProps } from "./core";

export type AsciiLoaderComponentProps = Partial<AsciiLoaderProps> & WrapperProps;

/** A text-mode loading indicator: a braille dot orbit, a progress bar, a shade pulse, or animated dots. */
export function AsciiLoader({ className, style, palette, ...props }: AsciiLoaderComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
