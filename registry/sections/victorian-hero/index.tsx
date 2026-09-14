"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type VictorianHeroProps } from "./core";

export type VictorianHeroComponentProps = Partial<VictorianHeroProps> & WrapperProps & { children?: ReactNode };

/** A playbill hero: a doubled ruled border with fleuron corners around stacked lines of type. */
export function VictorianHero({ className, style, palette, children, ...props }: VictorianHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
