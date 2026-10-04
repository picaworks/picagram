"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CropWindowEvents, type CropWindowProps } from "./core";

export type CropWindowComponentProps = Partial<CropWindowProps> & Handlers<CropWindowEvents> & WrapperProps & { children?: ReactNode };

/** Four accessible edges constrain a normalized crop over the page's own content. */
export function CropWindow({ className, style, palette, children, ...props }: CropWindowComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
