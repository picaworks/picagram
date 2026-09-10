"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiRevealProps } from "./core";

export interface AsciiRevealComponentProps extends Partial<AsciiRevealProps> {
  className?: string;
  style?: CSSProperties;
}

/** Text that cycles through scramble glyphs before settling into its final characters, left to right. */
export function AsciiReveal({ className, style, ...props }: AsciiRevealComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
