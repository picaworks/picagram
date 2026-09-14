"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MaximalistHeroProps } from "./core";

export type MaximalistHeroComponentProps = Partial<MaximalistHeroProps> & WrapperProps & { children?: ReactNode };

/** A maximalist page hero that packs two beating fields, three type sizes, and edge bands around a headline and copy. */
export function MaximalistHero({ className, style, palette, children, ...props }: MaximalistHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
