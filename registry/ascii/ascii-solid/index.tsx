"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiSolidProps } from "./core";

export interface AsciiSolidComponentProps extends Partial<AsciiSolidProps> {
  className?: string;
  style?: CSSProperties;
}

/** A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp. */
export function AsciiSolid({ className, style, ...props }: AsciiSolidComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
