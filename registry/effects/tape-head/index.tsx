"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TapeHeadProps } from "./core";

export type TapeHeadComponentProps = Partial<TapeHeadProps> & WrapperProps & { children?: ReactNode };

/** Two turning spools carry a tape path past a slowly traversing recording head. */
export function TapeHead({ className, style, palette, children, ...props }: TapeHeadComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
