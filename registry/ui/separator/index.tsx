"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SeparatorProps } from "./core";

export type SeparatorComponentProps = Partial<SeparatorProps> & WrapperProps;

/** A quiet horizontal or vertical hairline with an optional label on the horizontal rule. */
export function Separator({ className, style, palette, ...props }: SeparatorComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
