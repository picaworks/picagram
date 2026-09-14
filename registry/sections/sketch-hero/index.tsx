"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SketchHeroProps } from "./core";

export type SketchHeroComponentProps = Partial<SketchHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero still being drawn: hatching, construction lines, and working notes behind the content. */
export function SketchHero({ className, style, palette, children, ...props }: SketchHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
