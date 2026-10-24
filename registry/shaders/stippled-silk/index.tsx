"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type StippledSilkProps } from "./core";

export type StippledSilkComponentProps = Partial<StippledSilkProps> & WrapperProps;

/** Fine woven threads follow broad sheet folds under a slowly moving grazing light. */
export function StippledSilk({ className, style, palette, ...props }: StippledSilkComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
