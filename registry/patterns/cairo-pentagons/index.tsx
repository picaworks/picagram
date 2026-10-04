"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CairoPentagonsProps } from "./core";

export type CairoPentagonsComponentProps = Partial<CairoPentagonsProps> & WrapperProps & { children?: ReactNode };

/** A quiet Cairo pentagon tiling behind the host's readable, interactive content. */
export function CairoPentagons({ className, style, palette, children, ...props }: CairoPentagonsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
