"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SpringTraceProps } from "./core";

export type SpringTraceComponentProps = Partial<SpringTraceProps> & WrapperProps;

/** An analytic damped-spring response with overshoot, settling, and a cell-aligned trace. */
export function SpringTrace({ className, style, palette, ...props }: SpringTraceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
