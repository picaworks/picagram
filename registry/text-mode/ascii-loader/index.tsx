"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiLoaderProps } from "./core";

export interface AsciiLoaderComponentProps extends Partial<AsciiLoaderProps> {
  className?: string;
  style?: CSSProperties;
}

/** A text-mode loading indicator: a braille dot orbit, a progress bar, a shade pulse, or animated dots. */
export function AsciiLoader({ className, style, ...props }: AsciiLoaderComponentProps) {
  const ref = usePica(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...style }} />;
}
