"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RibbonCurrentProps } from "./core";

export type RibbonCurrentComponentProps = Partial<RibbonCurrentProps> & WrapperProps & { children?: ReactNode };

/** Ordered stream ribbons bend through a narrow channel with moving seams and a protected reading area. */
export function RibbonCurrent({ className, style, palette, children, ...props }: RibbonCurrentComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
