"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MinimalHeroProps } from "./core";

export type MinimalHeroComponentProps = Partial<MinimalHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero reduced to one large headline, a line of support, and a single call to action. */
export function MinimalHero({ className, style, palette, children, ...props }: MinimalHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
