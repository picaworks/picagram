"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type NeumorphicHeroProps } from "./core";

export type NeumorphicHeroComponentProps = Partial<NeumorphicHeroProps> & WrapperProps & { children?: ReactNode };

/** A soft UI hero: content on a slab raised from the ground by screened bevels, with a pressed call to action. */
export function NeumorphicHero({ className, style, palette, children, ...props }: NeumorphicHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
