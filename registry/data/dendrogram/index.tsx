"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DendrogramEvents, type DendrogramProps } from "./core";

export type DendrogramComponentProps = Partial<DendrogramProps> & WrapperProps & Handlers<DendrogramEvents>;

/** A distance-scaled hierarchy with selectable clusters and aligned leaf labels. */
export function Dendrogram({ className, style, palette, ...props }: DendrogramComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
