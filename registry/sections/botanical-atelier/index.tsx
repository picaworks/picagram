"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BotanicalAtelierProps } from "./core";

export type BotanicalAtelierComponentProps = Partial<BotanicalAtelierProps> & WrapperProps;

/** A botanical portfolio arranged as an herbarium cabinet with original drawings, taxonomy, and field notes. */
export function BotanicalAtelier({ className, style, palette, ...props }: BotanicalAtelierComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
