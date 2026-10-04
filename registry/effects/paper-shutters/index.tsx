"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PaperShuttersProps } from "./core";

export type PaperShuttersComponentProps = Partial<PaperShuttersProps> & WrapperProps & { children?: ReactNode };

/** Staggered rectangular shutters reveal an original printed field along the page edges. */
export function PaperShutters({ className, style, palette, children, ...props }: PaperShuttersComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
