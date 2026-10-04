"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiProcessMapProps } from "./core";
export type AsciiProcessMapComponentProps = Partial<AsciiProcessMapProps> & WrapperProps;
/** A reusable character decision map with editable steps and native choices that update the route summary. */
export function AsciiProcessMap({ className, style, palette, ...props }: AsciiProcessMapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
