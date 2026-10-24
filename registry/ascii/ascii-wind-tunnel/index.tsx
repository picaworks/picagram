"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiWindTunnelProps } from "./core";

export type AsciiWindTunnelComponentProps = Partial<AsciiWindTunnelProps> & WrapperProps & { children?: ReactNode };

/** Measured glyph streams bend around a circle and gather into a slow alternating wake. */
export function AsciiWindTunnel({ className, style, palette, children, ...props }: AsciiWindTunnelComponentProps) {
  const ref = usePica(mount, { readingZone: Boolean(children), ...props });
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
