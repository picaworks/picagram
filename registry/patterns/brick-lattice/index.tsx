"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BrickLatticeProps } from "./core";

export type BrickLatticeComponentProps = Partial<BrickLatticeProps> & WrapperProps & { children?: ReactNode };

/** A quiet masonry lattice drawn behind its content. */
export function BrickLattice({ className, style, palette, children, ...props }: BrickLatticeComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
