"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SeattleRainTerraceProps } from "./core";

export type SeattleRainTerraceComponentProps = Partial<SeattleRainTerraceProps> & WrapperProps;

/** Stepped hillside houses shelter a public stair under sparse falling rain. */
export function SeattleRainTerrace({ className, style, palette, ...props }: SeattleRainTerraceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
