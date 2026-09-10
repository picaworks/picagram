"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BentoGridProps } from "./core";

export type BentoGridComponentProps = Partial<BentoGridProps> & WrapperProps & { children?: ReactNode };

/** A section that lays its children out as a bento grid, sized by position and never touched. */
export function BentoGrid({ className, style, palette, children, ...props }: BentoGridComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
