"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type HalftoneImageProps } from "./core";

export interface HalftoneImageComponentProps extends Partial<HalftoneImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image screened into halftone dots, squares, or lines, drawn on a canvas in the host's ink color. */
export function HalftoneImage({ className, style, ...props }: HalftoneImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
