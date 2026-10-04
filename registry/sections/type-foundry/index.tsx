"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TypeFoundryProps } from "./core";

export type TypeFoundryComponentProps = Partial<TypeFoundryProps> & WrapperProps;

/** A type specimen page with a giant glyph, alphabet and size studies, and specimen licensing notes. */
export function TypeFoundry({ className, style, palette, ...props }: TypeFoundryComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
