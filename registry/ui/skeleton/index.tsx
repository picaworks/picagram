"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SkeletonProps } from "./core";

export type SkeletonComponentProps = Partial<SkeletonProps> & WrapperProps;

/** Ghost blocks that breathe between two quiet shade glyphs while content is loading. */
export function Skeleton({ className, style, palette, ...props }: SkeletonComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
