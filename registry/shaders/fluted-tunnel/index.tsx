"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FlutedTunnelProps } from "./core";

export type FlutedTunnelComponentProps = Partial<FlutedTunnelProps> & WrapperProps;

/** A finite chamber mouth frames fluted walls and receding joins around an open far aperture. */
export function FlutedTunnel({ className, style, palette, ...props }: FlutedTunnelComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
