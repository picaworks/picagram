"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FrostedBlockProps } from "./core";

export type FrostedBlockComponentProps = Partial<FrostedBlockProps> & WrapperProps;

/** A bevelled frosted slab refracts a sparse analytic line field. */
export function FrostedBlock({ className, style, palette, ...props }: FrostedBlockComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
