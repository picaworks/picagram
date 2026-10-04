"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FallingSuturesProps } from "./core";

export type FallingSuturesComponentProps = Partial<FallingSuturesProps> & WrapperProps & { children?: ReactNode };

/** Sparse stitched leaders drift down constrained side margins beside an uninterrupted reading centre. */
export function FallingSutures({ className, style, palette, children, ...props }: FallingSuturesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
