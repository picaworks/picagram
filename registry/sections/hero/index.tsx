"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HeroProps } from "./core";

export type HeroComponentProps = Partial<HeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero that adds a row of calls to action and a composed background behind a headline and copy. */
export function Hero({ className, style, palette, children, ...props }: HeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
