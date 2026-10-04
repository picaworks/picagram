"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GeodesicShellEvents, type GeodesicShellProps } from "./core";

export type GeodesicShellComponentProps = Partial<GeodesicShellProps> & WrapperProps & Handlers<GeodesicShellEvents>;

/** A subdivided geodesic dome with supplied panel records selected directly on facets or by accessible buttons. */
export function GeodesicShell({ className, style, palette, ...props }: GeodesicShellComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
