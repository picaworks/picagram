"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiVideoProps } from "./core";

export interface AsciiVideoComponentProps extends Partial<AsciiVideoProps> {
  className?: string;
  style?: CSSProperties;
}

/** A video or webcam feed drawn as a live grid of glyphs, the moving counterpart to AsciiImage. */
export function AsciiVideo({ className, style, ...props }: AsciiVideoComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
