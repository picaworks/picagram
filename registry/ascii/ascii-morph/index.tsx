"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiMorphProps } from "./core";

export interface AsciiMorphComponentProps extends Partial<AsciiMorphProps> {
  className?: string;
  style?: CSSProperties;
}

/** Two subjects that morph into each other and back, drawn as measured density glyphs. */
export function AsciiMorph({ className, style, ...props }: AsciiMorphComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
