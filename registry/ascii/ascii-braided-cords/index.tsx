"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiBraidedCordsProps } from "./core";

export type AsciiBraidedCordsComponentProps = Partial<AsciiBraidedCordsProps> & WrapperProps;

/** Three shaded glyph cords exchange depth along a slowly traveling braid. */
export function AsciiBraidedCords({ className, style, palette, ...props }: AsciiBraidedCordsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
