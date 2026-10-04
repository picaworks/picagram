"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PaperTheatreProps } from "./core";

export type PaperTheatreComponentProps = Partial<PaperTheatreProps> & WrapperProps;

/** An original spatial act route with a readable linear register. */
export function PaperTheatre({ className, style, palette, ...props }: PaperTheatreComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
