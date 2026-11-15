"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelFernLogProps } from "./core";

export type PixelFernLogComponentProps = Partial<PixelFernLogProps> & WrapperProps;

/** A conspicuous snail crawls around a hollow log framed by two fern fans. */
export function PixelFernLog({ className, style, palette, ...props }: PixelFernLogComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
