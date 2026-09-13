"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CausticFieldProps } from "./core";

export type CausticFieldComponentProps = Partial<CausticFieldProps> & WrapperProps;

/** The net of bright lines light draws on a pool floor, refracted through a wave surface on the GPU. */
export function CausticField({ className, style, palette, ...props }: CausticFieldComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
