"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiRollingCubeProps } from "./core";

export type AsciiRollingCubeComponentProps = Partial<AsciiRollingCubeProps> & WrapperProps;

/** One shaded glyph cube turns continuously above a short technical baseline. */
export function AsciiRollingCube({ className, style, palette, ...props }: AsciiRollingCubeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
