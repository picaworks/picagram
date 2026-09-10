"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiSparklineProps } from "./core";

export interface AsciiSparklineComponentProps extends Partial<AsciiSparklineProps> {
  className?: string;
  style?: CSSProperties;
}

/** A series of numbers drawn inline as a sparkline, in eighth-block bars or a braille line. */
export function AsciiSparkline({ className, style, ...props }: AsciiSparklineComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
