"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type InkErosionProps } from "./core";

export type InkErosionComponentProps = Partial<InkErosionProps> & WrapperProps & { children?: ReactNode };

/** Geometric printed bands lose and regain small edge cells through a slow structured erosion front. */
export function InkErosion({ className, style, palette, children, ...props }: InkErosionComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
