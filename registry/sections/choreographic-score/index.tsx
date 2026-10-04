"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ChoreographicScoreProps } from "./core";

export type ChoreographicScoreComponentProps = Partial<ChoreographicScoreProps> & WrapperProps;

/** A contemporary dance program with original movement notation, a timed instruction score, cast credits, and audience information. */
export function ChoreographicScore({ className, style, palette, ...props }: ChoreographicScoreComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
