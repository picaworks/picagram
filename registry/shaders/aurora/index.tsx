"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AuroraProps } from "./core";

export type AuroraComponentProps = Partial<AuroraProps> & WrapperProps;

/** Layered curtains of accent light standing on bowed lower borders, striated by vertical rays. */
export function Aurora({ className, style, palette, ...props }: AuroraComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
