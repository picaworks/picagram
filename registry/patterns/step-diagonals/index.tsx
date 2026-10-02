"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type StepDiagonalsProps } from "./core";

export type StepDiagonalsComponentProps = Partial<StepDiagonalsProps> & WrapperProps & { children?: ReactNode };

/** Staircases of square steps that read as diagonals behind page content. */
export function StepDiagonals({ className, style, palette, children, ...props }: StepDiagonalsComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
