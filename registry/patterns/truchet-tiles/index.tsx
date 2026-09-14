"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TruchetTilesProps } from "./core";

export type TruchetTilesComponentProps = Partial<TruchetTilesProps> & WrapperProps & { children?: ReactNode };

/** A seeded field of connected Truchet paths drawn behind its content. */
export function TruchetTiles({ className, style, palette, children, ...props }: TruchetTilesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
