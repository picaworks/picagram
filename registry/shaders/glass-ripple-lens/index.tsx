"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GlassRippleLensProps } from "./core";

export type GlassRippleLensComponentProps = Partial<GlassRippleLensProps> & WrapperProps;

/** One offset glass lens refracts a crisp analytic line field. */
export function GlassRippleLens({ className, style, palette, ...props }: GlassRippleLensComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
