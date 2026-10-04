"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FoldedAtlasEvents, type FoldedAtlasProps } from "./core";

export type FoldedAtlasComponentProps = Partial<FoldedAtlasProps> & WrapperProps & Handlers<FoldedAtlasEvents>;

/** Connected atlas panels fold along alternating hinges with accessible independent selection. */
export function FoldedAtlas({ className, style, palette, ...props }: FoldedAtlasComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
