"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DiagonalStripesProps } from "./core";

export type DiagonalStripesComponentProps = Partial<DiagonalStripesProps> & WrapperProps & { children?: ReactNode };

/** Fine diagonal rules that form a quiet background behind content. */
export function DiagonalStripes({ className, style, palette, children, ...props }: DiagonalStripesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
