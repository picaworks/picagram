"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type BlockImageProps } from "./core";

export interface BlockImageComponentProps extends Partial<BlockImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image drawn with the sixteen quadrant block characters, each matching the corners a 2 by 2 sample fills. */
export function BlockImage({ className, style, ...props }: BlockImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
