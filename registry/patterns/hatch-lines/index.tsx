"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HatchLinesProps } from "./core";

export type HatchLinesComponentProps = Partial<HatchLinesProps> & WrapperProps & { children?: ReactNode };

/** A quiet cross hatch background drawn in fine ink lines behind its content. */
export function HatchLines({ className, style, palette, children, ...props }: HatchLinesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
