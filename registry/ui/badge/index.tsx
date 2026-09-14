"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BadgeProps } from "./core";

export type BadgeComponentProps = Partial<BadgeProps> & WrapperProps;

/** A compact status label with a solid, outline, or bracket frame. */
export function Badge({ className, style, palette, ...props }: BadgeComponentProps) {
  const ref = usePica<BadgeProps, HTMLSpanElement>(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
