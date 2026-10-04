"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MagneticFilingsProps } from "./core";

export type MagneticFilingsComponentProps = Partial<MagneticFilingsProps> & WrapperProps & { children?: ReactNode };

/** Short filings align with a moving dipole field in the margins of a protected reading area. */
export function MagneticFilings({ className, style, palette, children, ...props }: MagneticFilingsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
