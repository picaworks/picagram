"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BentoHeroProps } from "./core";

export type BentoHeroComponentProps = Partial<BentoHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero laid out as a bento tray: a lead cell for the headline and calls to action over a content cell, beside smaller cells. */
export function BentoHero({ className, style, palette, children, ...props }: BentoHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
