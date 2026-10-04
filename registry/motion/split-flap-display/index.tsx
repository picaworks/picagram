"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SplitFlapDisplayProps } from "./core";

export type SplitFlapDisplayComponentProps = Partial<SplitFlapDisplayProps> & WrapperProps;

/** A short label in aligned split-flap cells, where only the characters that changed turn through the drum. */
export function SplitFlapDisplay({ className, style, palette, ...props }: SplitFlapDisplayComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
