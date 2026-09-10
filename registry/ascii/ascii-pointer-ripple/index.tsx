"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiPointerRippleProps } from "./core";

export interface AsciiPointerRippleComponentProps extends Partial<AsciiPointerRippleProps> {
  className?: string;
  style?: CSSProperties;
}

/** A field of low-density glyph noise that sends rings outward from the pointer, as if it were water. */
export function AsciiPointerRipple({ className, style, ...props }: AsciiPointerRippleComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
