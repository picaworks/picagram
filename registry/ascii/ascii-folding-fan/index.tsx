"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiFoldingFanProps } from "./core";

export type AsciiFoldingFanComponentProps = Partial<AsciiFoldingFanProps> & WrapperProps;

/** A finite pleated glyph fan breathes gently around a fixed hinge. */
export function AsciiFoldingFan({ className, style, palette, ...props }: AsciiFoldingFanComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
