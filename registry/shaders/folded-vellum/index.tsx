"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FoldedVellumProps } from "./core";

export type FoldedVellumComponentProps = Partial<FoldedVellumProps> & WrapperProps;

/** Connected translucent vellum folds carry quiet rules through their overlaps. */
export function FoldedVellum({ className, style, palette, ...props }: FoldedVellumComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
