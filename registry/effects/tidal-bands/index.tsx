"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TidalBandsProps } from "./core";

export type TidalBandsComponentProps = Partial<TidalBandsProps> & WrapperProps & { children?: ReactNode };

/** Parallel shoreline bands breathe at unequal periods beside an unpainted reading area. */
export function TidalBands({ className, style, palette, children, ...props }: TidalBandsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
