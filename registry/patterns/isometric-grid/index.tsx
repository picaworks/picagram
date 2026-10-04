"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type IsometricGridProps } from "./core";

export type IsometricGridComponentProps = Partial<IsometricGridProps> & WrapperProps & { children?: ReactNode };

/** An isometric lattice or dot paper drawn behind its content. */
export function IsometricGrid({ className, style, palette, children, ...props }: IsometricGridComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
