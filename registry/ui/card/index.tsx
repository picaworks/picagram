"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CardProps } from "./core";

export type CardComponentProps = Partial<CardProps> & WrapperProps & { children?: ReactNode };

/** A framed content block with an optional header and linked actions. */
export function Card({ className, style, palette, children, ...props }: CardComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
