"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScanlinesProps } from "./core";

export type ScanlinesComponentProps = Partial<ScanlinesProps> & WrapperProps & { children?: ReactNode };

/** A CRT scanline overlay, in the ink color, drawn above whatever content sits inside it. */
export function Scanlines({ className, style, palette, children, ...props }: ScanlinesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
