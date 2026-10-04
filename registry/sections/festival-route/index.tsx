"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FestivalRouteProps } from "./core";

export type FestivalRouteComponentProps = Partial<FestivalRouteProps> & WrapperProps;

/** A neighbourhood arts walk with an original schematic route, ordered venues, and accessible event information. */
export function FestivalRoute({ className, style, palette, ...props }: FestivalRouteComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
