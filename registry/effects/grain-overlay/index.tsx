"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GrainOverlayProps } from "./core";

export type GrainOverlayComponentProps = Partial<GrainOverlayProps> & WrapperProps & { children?: ReactNode };

/** Film grain laid over its content, a turbulence texture that jitters a few pixels several times a second. */
export function GrainOverlay({ className, style, palette, children, ...props }: GrainOverlayComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
