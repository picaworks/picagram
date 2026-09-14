"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PixelArtHeroProps } from "./core";

export type PixelArtHeroComponentProps = Partial<PixelArtHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero drawn as one low resolution screen: pixel type, snapped frames, and a shimmering field. */
export function PixelArtHero({ className, style, palette, children, ...props }: PixelArtHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
