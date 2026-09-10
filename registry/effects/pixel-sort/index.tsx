"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type PixelSortProps } from "./core";

export interface PixelSortComponentProps extends Partial<PixelSortProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image with its rows or columns sorted by brightness into smeared bands. */
export function PixelSort({ className, style, ...props }: PixelSortComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
