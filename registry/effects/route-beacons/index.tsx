"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RouteBeaconsProps } from "./core";

export type RouteBeaconsComponentProps = Partial<RouteBeaconsProps> & WrapperProps & { children?: ReactNode };

/** Discrete beacons travel bent routes past steady stations while the central copy remains clear. */
export function RouteBeacons({ className, style, palette, children, ...props }: RouteBeaconsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
