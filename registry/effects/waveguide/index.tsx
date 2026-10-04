"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WaveguideProps } from "./core";

export type WaveguideComponentProps = Partial<WaveguideProps> & WrapperProps & { children?: ReactNode };

/** Parallel transmission lines turn a fixed elbow and carry slow traveling pulses around the reading centre. */
export function Waveguide({ className, style, palette, children, ...props }: WaveguideComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
