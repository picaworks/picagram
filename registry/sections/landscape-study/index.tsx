"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LandscapeStudyProps } from "./core";

export type LandscapeStudyComponentProps = Partial<LandscapeStudyProps> & WrapperProps;

/** A landscape research page with original contour and transect diagrams, seasonal field measurements, and a reversible land trial. */
export function LandscapeStudy({ className, style, palette, ...props }: LandscapeStudyComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
