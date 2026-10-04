"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CellMosaicProps } from "./core";

export type CellMosaicComponentProps = Partial<CellMosaicProps> & WrapperProps & { children?: ReactNode };

/** A seeded mosaic of quiet polygonal cells drawn behind page content. */
export function CellMosaic({ className, style, palette, children, ...props }: CellMosaicComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
