"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SwissHeroProps } from "./core";

export type SwissHeroComponentProps = Partial<SwissHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero set on a strict twelve column grid, flush left, with hairline rules and one accent. */
export function SwissHero({ className, style, palette, children, ...props }: SwissHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
