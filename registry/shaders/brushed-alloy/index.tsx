"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BrushedAlloyProps } from "./core";

export type BrushedAlloyComponentProps = Partial<BrushedAlloyProps> & WrapperProps;

/** Fine directional grooves catch two broad, slowly moving reflections on a shallow alloy plate. */
export function BrushedAlloy({ className, style, palette, ...props }: BrushedAlloyComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
