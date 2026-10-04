"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelLouverProps } from "./core";

export type PixelLouverComponentProps = Partial<PixelLouverProps> & WrapperProps & { children?: ReactNode };

/** A bounded grid of mechanical louvers changes projected width in a slow traveling phase. */
export function PixelLouver({ className, style, palette, children, ...props }: PixelLouverComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
