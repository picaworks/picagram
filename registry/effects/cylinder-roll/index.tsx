"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CylinderRollProps } from "./core";

export type CylinderRollComponentProps = Partial<CylinderRollProps> & WrapperProps & { children?: ReactNode };

/** Printed stripes turn through a cylindrical projection along the page margin. */
export function CylinderRoll({ className, style, palette, children, ...props }: CylinderRollComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
