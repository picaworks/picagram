"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type OralHistoryProps } from "./core";

export type OralHistoryComponentProps = Partial<OralHistoryProps> & WrapperProps;

/** An interview transcript with alternating speaker labels, a spanning pullquote and a chapter index. */
export function OralHistory({ className, style, palette, ...props }: OralHistoryComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
