"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type GlitchTextProps } from "./core";

export interface GlitchTextComponentProps extends Partial<GlitchTextProps> {
  className?: string;
  style?: CSSProperties;
}

/** A line of text that glitches in short bursts, its strips shifting sideways before it snaps back clean. */
export function GlitchText({ className, style, ...props }: GlitchTextComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
