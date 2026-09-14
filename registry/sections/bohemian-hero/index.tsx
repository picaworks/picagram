"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BohemianHeroProps } from "./core";

export type BohemianHeroComponentProps = Partial<BohemianHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero dressed like a weaving, with thread bands, a scalloped hairline arch, and offset copy. */
export function BohemianHero({ className, style, palette, children, ...props }: BohemianHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
