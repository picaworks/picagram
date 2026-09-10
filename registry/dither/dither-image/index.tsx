"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type DitherImageProps } from "./core";

export interface DitherImageComponentProps extends Partial<DitherImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image reduced to two tones by dithering, drawn crisp on a canvas at a chosen pixel scale. */
export function DitherImage({ className, style, ...props }: DitherImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
