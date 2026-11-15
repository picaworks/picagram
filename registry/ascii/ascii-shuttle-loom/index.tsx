"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiShuttleLoomProps } from "./core";

export type AsciiShuttleLoomComponentProps = Partial<AsciiShuttleLoomProps> & WrapperProps;

/** A single shuttle passes between raised warp banks above a short woven strip. */
export function AsciiShuttleLoom({ className, style, palette, ...props }: AsciiShuttleLoomComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
