"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GridPaperProps } from "./core";

export type GridPaperComponentProps = Partial<GridPaperProps> & WrapperProps & { children?: ReactNode };

/** A quiet engineering grid drawn behind the content it wraps. */
export function GridPaper({ className, style, palette, children, ...props }: GridPaperComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
