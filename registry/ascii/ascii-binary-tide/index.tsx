"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiBinaryTideProps } from "./core";

export type AsciiBinaryTideComponentProps = Partial<AsciiBinaryTideProps> & WrapperProps & { children?: ReactNode };

/** Broad binary wave bands with an optional quiet center for reading content. */
export function AsciiBinaryTide({ className, style, palette, children, ...props }: AsciiBinaryTideComponentProps) {
  const ref = usePica(mount, { readingZone: Boolean(children), ...props });
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
