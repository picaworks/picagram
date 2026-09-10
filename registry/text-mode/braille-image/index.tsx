"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type BrailleImageProps } from "./core";

export interface BrailleImageComponentProps extends Partial<BrailleImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image drawn with braille dot patterns, at four times the vertical resolution of a plain glyph ramp. */
export function BrailleImage({ className, style, ...props }: BrailleImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
