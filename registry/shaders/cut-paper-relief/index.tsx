"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CutPaperReliefProps } from "./core";

export type CutPaperReliefComponentProps = Partial<CutPaperReliefProps> & WrapperProps;

/** Nested cut sheets catch a slow light around a broad, clear opening. */
export function CutPaperRelief({ className, style, palette, ...props }: CutPaperReliefComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
