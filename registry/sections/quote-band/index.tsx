"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type QuoteBandProps } from "./core";

export type QuoteBandComponentProps = Partial<QuoteBandProps> & WrapperProps & { children?: ReactNode };

/** One pull quote set large across a band of the page, with its attribution and nothing else. */
export function QuoteBand({ className, style, palette, children, ...props }: QuoteBandComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
