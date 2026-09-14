"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DrawerEvents, type DrawerProps } from "./core";

export type DrawerComponentProps = Partial<DrawerProps> & Handlers<DrawerEvents> & WrapperProps & { children?: ReactNode };

/** A native modal panel pinned to the left, right, or bottom edge of the viewport. */
export function Drawer({ className, style, palette, children, ...props }: DrawerComponentProps) {
  const ref = usePica<DrawerProps, HTMLDialogElement>(mount, props);
  return (
    <dialog ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </dialog>
  );
}
