"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiTextProps } from "./core";

export interface AsciiTextComponentProps extends Partial<AsciiTextProps> {
  className?: string;
  style?: CSSProperties;
}

/** A headline set in a display face, then redrawn as a grid of glyphs chosen by measured ink and shape. */
export function AsciiText({ className, style, ...props }: AsciiTextComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
