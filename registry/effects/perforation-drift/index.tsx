"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PerforationDriftProps } from "./core";

export type PerforationDriftComponentProps = Partial<PerforationDriftProps> & WrapperProps & { children?: ReactNode };

/** Paired punched film perforations travel quietly along continuous margin rails. */
export function PerforationDrift({ className, style, palette, children, ...props }: PerforationDriftComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
