"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EtherealHeroProps } from "./core";

export type EtherealHeroComponentProps = Partial<EtherealHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero that floats its copy in clear air while blue noise grain rises from the ground below. */
export function EtherealHero({ className, style, palette, children, ...props }: EtherealHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
