"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DuotoneImageProps } from "./core";

export type DuotoneImageComponentProps = Partial<DuotoneImageProps> & WrapperProps;

/** An image posterized into flat tone bands, each drawn at a stepped opacity in the host's ink color. */
export function DuotoneImage({ className, style, palette, ...props }: DuotoneImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
