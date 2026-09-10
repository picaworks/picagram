"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type DitherGradientProps } from "./core";

export interface DitherGradientComponentProps extends Partial<DitherGradientProps> {
  className?: string;
  style?: CSSProperties;
}

/** A two-tone gradient dithered through a Bayer matrix, its tone carried by dot density alone. */
export function DitherGradient({ className, style, ...props }: DitherGradientComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
