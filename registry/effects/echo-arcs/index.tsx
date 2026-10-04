"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EchoArcsProps } from "./core";

export type EchoArcsComponentProps = Partial<EchoArcsProps> & WrapperProps & { children?: ReactNode };

/** Off centre arc segments expand and decay gradually around a protected reading area. */
export function EchoArcs({ className, style, palette, children, ...props }: EchoArcsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
