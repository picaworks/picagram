"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WeaveLinesProps } from "./core";

export type WeaveLinesComponentProps = Partial<WeaveLinesProps> & WrapperProps & { children?: ReactNode };

/** A woven surface of outlined ribbons whose under strands break at every crossing. */
export function WeaveLines({ className, style, palette, children, ...props }: WeaveLinesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
