"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LiquidMetalProps } from "./core";

export type LiquidMetalComponentProps = Partial<LiquidMetalProps> & WrapperProps;

/** Slow blobs that merge and part, each one mirroring a two band horizon so it reads as mercury. */
export function LiquidMetal({ className, style, palette, ...props }: LiquidMetalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
