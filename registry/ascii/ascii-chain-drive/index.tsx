"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiChainDriveProps } from "./core";

export type AsciiChainDriveComponentProps = Partial<AsciiChainDriveProps> & WrapperProps;

/** Discrete glyph links travel around a pair of unequal toothed sprockets. */
export function AsciiChainDrive({ className, style, palette, ...props }: AsciiChainDriveComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
