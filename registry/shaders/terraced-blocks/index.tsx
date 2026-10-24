"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TerracedBlocksProps } from "./core";

export type TerracedBlocksComponentProps = Partial<TerracedBlocksProps> & WrapperProps;

/** Finite beveled plateaus step down toward a clear central reading opening. */
export function TerracedBlocks({ className, style, palette, ...props }: TerracedBlocksComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
