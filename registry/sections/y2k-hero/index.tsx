"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type Y2kHeroProps } from "./core";

export type Y2kHeroComponentProps = Partial<Y2kHeroProps> & WrapperProps & { children?: ReactNode };

/** A centered millennium hero: banded chrome rails, seeded starbursts, a scrolling ticker, and beveled links. */
export function Y2kHero({ className, style, palette, children, ...props }: Y2kHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
