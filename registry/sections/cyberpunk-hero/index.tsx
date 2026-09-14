"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CyberpunkHeroProps } from "./core";

export type CyberpunkHeroComponentProps = Partial<CyberpunkHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero that reads as a terminal held open too long: scanlines, a tearing headline, and corner readouts. */
export function CyberpunkHero({ className, style, palette, children, ...props }: CyberpunkHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
