"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TramCornerProps } from "./core";

export type TramCornerComponentProps = Partial<TramCornerProps> & WrapperProps;

/** A double cab tram follows a broad rail bend beside a compact masonry block. */
export function TramCorner({ className, style, palette, ...props }: TramCornerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
