"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ButtonEvents, type ButtonProps } from "./core";

export type ButtonComponentProps = Partial<ButtonProps> & Handlers<ButtonEvents> & WrapperProps & { children?: ReactNode };

/** A button in four looks, solid, outline, ghost, and monospace brackets, with a braille spinner while it loads. */
export function Button({ className, style, palette, children, ...props }: ButtonComponentProps) {
  const ref = usePica<ButtonProps, HTMLButtonElement>(mount, props);
  return (
    <button ref={ref} type={props.type ?? "button"} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </button>
  );
}
