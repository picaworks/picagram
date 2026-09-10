"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiWavesProps } from "./core";

export interface AsciiWavesComponentProps extends Partial<AsciiWavesProps> {
  className?: string;
  style?: CSSProperties;
}

/** Interference between a few drifting circular wave sources, drawn as glyph density. */
export function AsciiWaves({ className, style, ...props }: AsciiWavesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
