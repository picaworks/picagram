"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiProcessMapEvents, type AsciiProcessMapProps } from "./core";

export type AsciiProcessMapComponentProps = Partial<AsciiProcessMapProps> & Handlers<AsciiProcessMapEvents> & WrapperProps;

/** A decision flow drawn in box-drawing characters, with native choices that trace the selected route. */
export function AsciiProcessMap({ className, style, palette, ...props }: AsciiProcessMapComponentProps) {
  const ref = usePica<AsciiProcessMapProps>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
