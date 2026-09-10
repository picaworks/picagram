"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ShaderFlowProps } from "./core";

export type ShaderFlowComponentProps = Partial<ShaderFlowProps> & WrapperProps;

/** Hairline contour bands that flow through the ground like a slow current, folded by noise on the GPU. */
export function ShaderFlow({ className, style, palette, ...props }: ShaderFlowComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
