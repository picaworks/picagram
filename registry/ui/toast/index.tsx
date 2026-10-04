"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ToastEvents, type ToastProps } from "./core";

export type ToastComponentProps = Partial<ToastProps> & Handlers<ToastEvents> & WrapperProps;

/** A polite live stack of dismissible notices with pausable expiry and four corner positions. */
export function Toast({ className, style, palette, ...props }: ToastComponentProps) {
  const ref = usePica<ToastProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
