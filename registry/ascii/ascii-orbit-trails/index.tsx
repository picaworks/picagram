"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiOrbitTrailsProps } from "./core";

export type AsciiOrbitTrailsComponentProps = Partial<AsciiOrbitTrailsProps> & WrapperProps;

/** Independent glyph markers describe elliptical paths with short measured trails. */
export function AsciiOrbitTrails({ className, style, palette, ...props }: AsciiOrbitTrailsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
