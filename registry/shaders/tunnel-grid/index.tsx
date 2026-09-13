"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TunnelGridProps } from "./core";

export type TunnelGridComponentProps = Partial<TunnelGridProps> & WrapperProps;

/** A slow flight down a tunnel drawn as a hairline grid receding to a vanishing point. */
export function TunnelGrid({ className, style, palette, ...props }: TunnelGridComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
