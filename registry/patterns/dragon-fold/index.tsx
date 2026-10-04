"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DragonFoldProps } from "./core";

export type DragonFoldComponentProps = Partial<DragonFoldProps> & WrapperProps & { children?: ReactNode };

/** A quiet connected paper-fold dragon print behind optional page-owned content. */
export function DragonFold({ className, style, palette, children, ...props }: DragonFoldComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
