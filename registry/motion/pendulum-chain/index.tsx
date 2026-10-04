"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PendulumChainProps } from "./core";

export type PendulumChainComponentProps = Partial<PendulumChainProps> & WrapperProps;

/** A fixed row of glyph pendulums exchanging motion through neighbor springs. */
export function PendulumChain({ className, style, palette, ...props }: PendulumChainComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
