"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WindVectorProps } from "./core";

export type WindVectorComponentProps = Partial<WindVectorProps> & WrapperProps & { children?: ReactNode };

/** A sparse lattice of direction marks turns slowly through a smooth wind field around wrapped content. */
export function WindVector({ className, style, palette, children, ...props }: WindVectorComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
