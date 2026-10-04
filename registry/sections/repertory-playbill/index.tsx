"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RepertoryPlaybillProps } from "./core";

export type RepertoryPlaybillComponentProps = Partial<RepertoryPlaybillProps> & WrapperProps;

/** A folded theatre playbill with cast billing, an original stage plan, and audience information. */
export function RepertoryPlaybill({ className, style, palette, ...props }: RepertoryPlaybillComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
