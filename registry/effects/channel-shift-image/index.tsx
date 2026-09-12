"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ChannelShiftImageProps } from "./core";

export type ChannelShiftImageComponentProps = Partial<ChannelShiftImageProps> & WrapperProps;

/** An image split into a dark layer and a light layer, each posterized flat and slid apart, like a print whose passes never lined up. */
export function ChannelShiftImage({ className, style, palette, ...props }: ChannelShiftImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
