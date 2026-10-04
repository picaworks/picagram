"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RadarSweepProps } from "./core";

export type RadarSweepComponentProps = Partial<RadarSweepProps> & WrapperProps & { children?: ReactNode };

/** Slow range rings and a rotating sector reveal fixed target echoes around a protected reading area. */
export function RadarSweep({ className, style, palette, children, ...props }: RadarSweepComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
