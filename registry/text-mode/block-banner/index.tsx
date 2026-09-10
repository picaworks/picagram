"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type BlockBannerProps } from "./core";

export interface BlockBannerComponentProps extends Partial<BlockBannerProps> {
  className?: string;
  style?: CSSProperties;
}

/** Large block letters drawn in text, from an original five row pixel font. */
export function BlockBanner({ className, style, ...props }: BlockBannerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
