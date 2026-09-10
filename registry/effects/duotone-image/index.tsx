"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type DuotoneImageProps } from "./core";

export interface DuotoneImageComponentProps extends Partial<DuotoneImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image posterized into flat tone bands, each drawn at a stepped opacity in the host's ink color. */
export function DuotoneImage({ className, style, ...props }: DuotoneImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
