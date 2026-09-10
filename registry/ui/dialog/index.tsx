"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DialogEvents, type DialogProps } from "./core";

export type DialogComponentProps = Partial<DialogProps> & Handlers<DialogEvents> & WrapperProps & { children?: ReactNode };

/** A modal dialog on the native dialog element, with a title bar, an optional close button, and its
 *  children as the body. */
export function Dialog({ className, style, palette, children, ...props }: DialogComponentProps) {
  const ref = usePica<DialogProps, HTMLDialogElement>(mount, props);
  return (
    <dialog ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </dialog>
  );
}
