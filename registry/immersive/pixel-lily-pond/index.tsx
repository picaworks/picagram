"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelLilyPondProps } from "./core";

export type PixelLilyPondComponentProps = Partial<PixelLilyPondProps> & WrapperProps;

/** A large fish circles a sheltered lotus on a finite pond tile. */
export function PixelLilyPond({ className, style, palette, ...props }: PixelLilyPondComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
