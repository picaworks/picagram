"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type GlassHeroProps } from "./core";

export type GlassHeroComponentProps = Partial<GlassHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero that floats a frosted pane of screened dots over a field drifting behind it. */
export function GlassHero({ className, style, palette, children, ...props }: GlassHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
