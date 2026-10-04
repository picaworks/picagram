"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type StrataStackEvents, type StrataStackProps } from "./core";

export type StrataStackComponentProps = Partial<StrataStackProps> & Handlers<StrataStackEvents> & WrapperProps;

/** Supplied geological thicknesses form an exploded stack with accessible record selection. */
export function StrataStack({ className, style, palette, ...props }: StrataStackComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
