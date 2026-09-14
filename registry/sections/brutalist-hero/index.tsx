"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BrutalistHeroProps } from "./core";

export type BrutalistHeroComponentProps = Partial<BrutalistHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero section that shows its structure: every block boxed, bordered, and colliding. */
export function BrutalistHero({ className, style, palette, children, ...props }: BrutalistHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
