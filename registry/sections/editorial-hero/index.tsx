"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EditorialHeroProps } from "./core";

export type EditorialHeroComponentProps = Partial<EditorialHeroProps> & WrapperProps & { children?: ReactNode };

/** A magazine opening spread: a deck, a large headline, a measured standfirst with a drop capital, and a byline between hairlines. */
export function EditorialHero({ className, style, palette, children, ...props }: EditorialHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
