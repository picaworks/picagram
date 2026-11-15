"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiExpandingTrussProps } from "./core";

export type AsciiExpandingTrussComponentProps = Partial<AsciiExpandingTrussProps> & WrapperProps;

/** Continuous crossed bars and sliding pins deploy around a clear circular aperture. */
export function AsciiExpandingTruss({ className, style, palette, ...props }: AsciiExpandingTrussComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
