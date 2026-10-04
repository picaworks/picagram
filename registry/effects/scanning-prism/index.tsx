"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScanningPrismProps } from "./core";

export type ScanningPrismComponentProps = Partial<ScanningPrismProps> & WrapperProps & { children?: ReactNode };

/** An offset triangular prism translates diagonal hatch into quiet parallel optical strands. */
export function ScanningPrism({ className, style, palette, children, ...props }: ScanningPrismComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
