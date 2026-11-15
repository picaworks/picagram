"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CanalRowProps } from "./core";

export type CanalRowComponentProps = Partial<CanalRowProps> & WrapperProps;

/** Unequal townhouse banks frame one hinged footbridge and a still waiting boat. */
export function CanalRow({ className, style, palette, ...props }: CanalRowComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
