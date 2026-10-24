"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiAccordionSurfaceProps } from "./core";

export type AsciiAccordionSurfaceComponentProps = Partial<AsciiAccordionSurfaceProps> & WrapperProps;

/** A shaded glyph mesh opens into alternating accordion folds. */
export function AsciiAccordionSurface({ className, style, palette, ...props }: AsciiAccordionSurfaceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
