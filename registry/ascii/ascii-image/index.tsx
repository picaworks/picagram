"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiImageProps } from "./core";

export interface AsciiImageComponentProps extends Partial<AsciiImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image drawn as a grid of glyphs, each chosen by the ink it puts down in the font in use. */
export function AsciiImage({ className, style, ...props }: AsciiImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
