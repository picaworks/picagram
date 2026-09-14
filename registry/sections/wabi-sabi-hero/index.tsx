"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WabiSabiHeroProps } from "./core";

export type WabiSabiHeroComponentProps = Partial<WabiSabiHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero laid out like a worn page: an incomplete frame, rules that stop short, and seeded wear. */
export function WabiSabiHero({ className, style, palette, children, ...props }: WabiSabiHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
