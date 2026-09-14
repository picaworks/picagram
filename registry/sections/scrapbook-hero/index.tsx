"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScrapbookHeroProps } from "./core";

export type ScrapbookHeroComponentProps = Partial<ScrapbookHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero assembled like a scrapbook page: torn slips, tape, and seeded tilts around the page's own copy. */
export function ScrapbookHero({ className, style, palette, children, ...props }: ScrapbookHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
