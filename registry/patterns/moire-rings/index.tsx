"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MoireRingsProps } from "./core";

export type MoireRingsComponentProps = Partial<MoireRingsProps> & WrapperProps & { children?: ReactNode };

/** Two slightly different concentric ring fields that form a quiet moire behind content. */
export function MoireRings({ className, style, palette, children, ...props }: MoireRingsComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
