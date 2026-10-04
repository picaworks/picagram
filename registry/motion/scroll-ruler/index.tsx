"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScrollRulerEvents, type ScrollRulerProps } from "./core";

export type ScrollRulerComponentProps = Partial<ScrollRulerProps> & WrapperProps & Handlers<ScrollRulerEvents> & { children?: ReactNode };

/** A measured ruler for this container's own scroll range, with pointer and keyboard seeking. */
export function ScrollRuler({ className, style, palette, children, ...props }: ScrollRulerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
