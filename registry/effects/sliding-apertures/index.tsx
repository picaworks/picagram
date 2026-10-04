"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SlidingAperturesProps } from "./core";

export type SlidingAperturesComponentProps = Partial<SlidingAperturesProps> & WrapperProps & { children?: ReactNode };

/** Offset rectangular apertures slide across a fixed geometric line plate in the margins. */
export function SlidingApertures({ className, style, palette, children, ...props }: SlidingAperturesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
