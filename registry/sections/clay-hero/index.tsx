"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ClayHeroProps } from "./core";

export type ClayHeroComponentProps = Partial<ClayHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero that settles soft, banded clay forms behind the content the page wraps. */
export function ClayHero({ className, style, palette, children, ...props }: ClayHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
