"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiRainProps } from "./core";

export interface AsciiRainComponentProps extends Partial<AsciiRainProps> {
  className?: string;
  style?: CSSProperties;
}

/** Columns of glyphs falling at their own speed, each with a bright head and a trail that fades down the ramp. */
export function AsciiRain({ className, style, ...props }: AsciiRainComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
