"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SandRipplesProps } from "./core";

export type SandRipplesComponentProps = Partial<SandRipplesProps> & WrapperProps;

/** Asymmetric wind crests and sheltered troughs cross a finite low dune patch. */
export function SandRipples({ className, style, palette, ...props }: SandRipplesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
