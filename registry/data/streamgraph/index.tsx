"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type StreamgraphProps } from "./core";

export type StreamgraphComponentProps = Partial<StreamgraphProps> & WrapperProps;

/** A stacked area chart whose layers float around a centre line, so each band's thickness is its value. */
export function Streamgraph({ className, style, palette, ...props }: StreamgraphComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
