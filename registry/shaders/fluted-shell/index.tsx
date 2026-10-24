"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FlutedShellProps } from "./core";

export type FlutedShellComponentProps = Partial<FlutedShellProps> & WrapperProps;

/** A concave scalloped shell catches moving light across radial flutes. */
export function FlutedShell({ className, style, palette, ...props }: FlutedShellComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
