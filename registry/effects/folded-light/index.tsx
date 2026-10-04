"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FoldedLightProps } from "./core";

export type FoldedLightComponentProps = Partial<FoldedLightProps> & WrapperProps & { children?: ReactNode };

/** Triangular crease planes carry a slow shifting illumination in the page margins. */
export function FoldedLight({ className, style, palette, children, ...props }: FoldedLightComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
