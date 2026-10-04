"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DotLatticeProps } from "./core";

export type DotLatticeComponentProps = Partial<DotLatticeProps> & WrapperProps & { children?: ReactNode };

/** A quiet lattice of ink points drawn behind the content it wraps. */
export function DotLattice({ className, style, palette, children, ...props }: DotLatticeComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
