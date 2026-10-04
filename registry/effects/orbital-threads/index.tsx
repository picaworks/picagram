"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type OrbitalThreadsProps } from "./core";

export type OrbitalThreadsComponentProps = Partial<OrbitalThreadsProps> & WrapperProps & { children?: ReactNode };

/** Inclined orbit threads carry moving stitch segments while leaving the reading centre unpainted. */
export function OrbitalThreads({ className, style, palette, children, ...props }: OrbitalThreadsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
