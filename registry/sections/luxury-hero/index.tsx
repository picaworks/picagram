"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LuxuryHeroProps } from "./core";

export type LuxuryHeroComponentProps = Partial<LuxuryHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero of restraint: a small tracked headline, one accent hairline, and underlined text links over empty ground. */
export function LuxuryHero({ className, style, palette, children, ...props }: LuxuryHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
