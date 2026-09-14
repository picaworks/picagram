"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LiquidGlassHeroProps } from "./core";

export type LiquidGlassHeroComponentProps = Partial<LiquidGlassHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero behind a drifting lens slab that bends the printed field beneath its curved edge. */
export function LiquidGlassHero({ className, style, palette, children, ...props }: LiquidGlassHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
