"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type HalftoneCssProps } from "./core";

export interface HalftoneCssComponentProps extends Partial<HalftoneCssProps> {
  className?: string;
  style?: CSSProperties;
}

/** A halftone dot pattern drawn entirely in layered CSS gradients, for use as a background. */
export function HalftoneCss({ className, style, ...props }: HalftoneCssComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
