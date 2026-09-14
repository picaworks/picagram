"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CollapsibleEvents, type CollapsibleProps } from "./core";

export type CollapsibleComponentProps = Partial<CollapsibleProps> & Handlers<CollapsibleEvents> & WrapperProps & { children?: ReactNode };

/** A single disclosure that shows or hides one block of page content. */
export function Collapsible({ className, style, palette, children, ...props }: CollapsibleComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
