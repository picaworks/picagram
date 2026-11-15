"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ShopLaneProps } from "./core";

export type ShopLaneComponentProps = Partial<ShopLaneProps> & WrapperProps;

/** Deep shops frame a walking lane while one near screen slides into its wall pocket. */
export function ShopLane({ className, style, palette, ...props }: ShopLaneComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
