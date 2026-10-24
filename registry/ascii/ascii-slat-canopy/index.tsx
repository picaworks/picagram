"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiSlatCanopyProps } from "./core";

export type AsciiSlatCanopyComponentProps = Partial<AsciiSlatCanopyProps> & WrapperProps;

/** Parallel curved slats rock gently within an open architectural vault. */
export function AsciiSlatCanopy({ className, style, palette, ...props }: AsciiSlatCanopyComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
