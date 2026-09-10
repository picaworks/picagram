"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MarqueeProps } from "./core";

export type MarqueeComponentProps = Partial<MarqueeProps> & WrapperProps & { children?: ReactNode };

/** A row of children that scrolls sideways in an endless loop, like a ticker. */
export function Marquee({ className, style, palette, children, ...props }: MarqueeComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
