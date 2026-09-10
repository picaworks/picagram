"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BlockImageProps } from "./core";

export type BlockImageComponentProps = Partial<BlockImageProps> & WrapperProps;

/** An image drawn with the sixteen quadrant block characters, each matching the corners a 2 by 2 sample fills. */
export function BlockImage({ className, style, palette, ...props }: BlockImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
