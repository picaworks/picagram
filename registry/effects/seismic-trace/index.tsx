"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SeismicTraceProps } from "./core";

export type SeismicTraceComponentProps = Partial<SeismicTraceProps> & WrapperProps & { children?: ReactNode };

/** Stacked instrument traces advance beneath a slow recording head with stable ruled baselines. */
export function SeismicTrace({ className, style, palette, children, ...props }: SeismicTraceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
