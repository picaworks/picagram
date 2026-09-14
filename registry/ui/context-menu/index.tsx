"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ContextMenuEvents, type ContextMenuProps } from "./core";

export type ContextMenuComponentProps = Partial<ContextMenuProps> & Handlers<ContextMenuEvents> & WrapperProps & { children?: ReactNode };

/** A framed content region with an accessible menu at the pointer or keyboard anchor. */
export function ContextMenu({ className, style, palette, children, ...props }: ContextMenuComponentProps) {
  const ref = usePica<ContextMenuProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>{children}</div>;
}
