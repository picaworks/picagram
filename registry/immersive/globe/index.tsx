"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GlobeProps } from "./core";

export type GlobeComponentProps = Partial<GlobeProps> & WrapperProps;

/** A dotted globe that turns slowly on a tilted axis, with named places marked on its surface. */
export function Globe({ className, style, palette, ...props }: GlobeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
