"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../../lib/use-pica";
import { mount, type SectionProps } from "./core";

export type SectionComponentProps = Partial<SectionProps> & WrapperProps;

/** A fixture section that composes another core. */
export function Section({ className, style, palette, ...props }: SectionComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
