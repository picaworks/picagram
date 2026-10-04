"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CheckerboardProps } from "./core";

export type CheckerboardComponentProps = Partial<CheckerboardProps> & WrapperProps & { children?: ReactNode };

/** A quiet checkerboard background drawn beneath its content. */
export function Checkerboard({ className, style, palette, children, ...props }: CheckerboardComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
