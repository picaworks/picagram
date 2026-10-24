"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LenticularRidgesProps } from "./core";

export type LenticularRidgesComponentProps = Partial<LenticularRidgesProps> & WrapperProps;

/** Shallow optical ridges bend an analytic line field under a slowly shifting light. */
export function LenticularRidges({ className, style, palette, ...props }: LenticularRidgesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
