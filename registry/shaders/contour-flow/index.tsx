"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ContourFlowProps } from "./core";

export type ContourFlowComponentProps = Partial<ContourFlowProps> & WrapperProps;

/** Contour lines over a slowly drifting terrain, lit so relief reads from the lines alone. */
export function ContourFlow({ className, style, palette, ...props }: ContourFlowComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
