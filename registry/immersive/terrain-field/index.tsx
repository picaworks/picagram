"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TerrainFieldProps } from "./core";

export type TerrainFieldComponentProps = Partial<TerrainFieldProps> & WrapperProps;

/** A landscape of profile lines that drift toward the viewer, each ridge hiding the rows behind it. */
export function TerrainField({ className, style, palette, ...props }: TerrainFieldComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
