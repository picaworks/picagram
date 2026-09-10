"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type GrainOverlayProps } from "./core";

export interface GrainOverlayComponentProps extends Partial<GrainOverlayProps> {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Film grain laid over its content, a turbulence texture that jitters a few pixels several times a second. */
export function GrainOverlay({ className, style, children, ...props }: GrainOverlayComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }}>
      {children}
    </div>
  );
}
