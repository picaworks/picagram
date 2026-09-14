"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CircuitTracesProps } from "./core";

export type CircuitTracesComponentProps = Partial<CircuitTracesProps> & WrapperProps & { children?: ReactNode };

/** A seeded circuit board pattern that sits behind content. */
export function CircuitTraces({ className, style, palette, children, ...props }: CircuitTracesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
