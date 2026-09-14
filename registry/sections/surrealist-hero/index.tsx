"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SurrealistHeroProps } from "./core";

export type SurrealistHeroComponentProps = Partial<SurrealistHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero behind which a dithered sea stands at two heights, under a sun reflected in the wrong shape. */
export function SurrealistHero({ className, style, palette, children, ...props }: SurrealistHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
