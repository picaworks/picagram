"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WovenTensionProps } from "./core";

export type WovenTensionComponentProps = Partial<WovenTensionProps> & WrapperProps & { children?: ReactNode };

/** Interleaved threads carry small tension waves with alternating over and under crossings. */
export function WovenTension({ className, style, palette, children, ...props }: WovenTensionComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
