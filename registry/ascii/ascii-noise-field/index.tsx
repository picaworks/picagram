"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiNoiseFieldProps } from "./core";

export interface AsciiNoiseFieldComponentProps extends Partial<AsciiNoiseFieldProps> {
  className?: string;
  style?: CSSProperties;
}

/** A quiet field of drifting simplex noise, drawn as glyphs chosen by measured density. */
export function AsciiNoiseField({ className, style, ...props }: AsciiNoiseFieldComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
