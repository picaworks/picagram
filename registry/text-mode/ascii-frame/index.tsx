"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiFrameProps } from "./core";

export type AsciiFrameComponentProps = Partial<AsciiFrameProps> & WrapperProps & { children?: ReactNode };

/** A container framed in box-drawing characters, with an optional title set into the top rule. */
export function AsciiFrame({ className, style, palette, children, ...props }: AsciiFrameComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
