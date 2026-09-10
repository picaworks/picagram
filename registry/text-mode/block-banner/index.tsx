"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BlockBannerProps } from "./core";

export type BlockBannerComponentProps = Partial<BlockBannerProps> & WrapperProps;

/** Large block letters drawn in text, from an original five row pixel font. */
export function BlockBanner({ className, style, palette, ...props }: BlockBannerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
