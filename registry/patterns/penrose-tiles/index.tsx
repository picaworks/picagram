"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PenroseTilesProps } from "./core";

export type PenroseTilesComponentProps = Partial<PenroseTilesProps> & WrapperProps & { children?: ReactNode };

/** A quiet quasiperiodic rhombus surface behind the page's own content. */
export function PenroseTiles({ className, style, palette, children, ...props }: PenroseTilesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
