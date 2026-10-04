"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MagneticFilingsProps } from "./core";

export type MagneticFilingsComponentProps = Partial<MagneticFilingsProps> & WrapperProps & { children?: ReactNode };

/** Orientation glyphs follow the field of slowly drifting charges behind the content they wrap. */
export function MagneticFilings({ className, style, palette, children, ...props }: MagneticFilingsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
