"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HexLatticeProps } from "./core";

export type HexLatticeComponentProps = Partial<HexLatticeProps> & WrapperProps & { children?: ReactNode };

/** A regular hexagonal lattice drawn quietly behind page content. */
export function HexLattice({ className, style, palette, children, ...props }: HexLatticeComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
