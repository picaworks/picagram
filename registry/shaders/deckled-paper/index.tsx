"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DeckledPaperProps } from "./core";

export type DeckledPaperComponentProps = Partial<DeckledPaperProps> & WrapperProps;

/** A finite rough-edged paper sheet catches grazing light across its bow and fibers. */
export function DeckledPaper({ className, style, palette, ...props }: DeckledPaperComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
