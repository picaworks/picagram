"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScallopArchesProps } from "./core";

export type ScallopArchesComponentProps = Partial<ScallopArchesProps> & WrapperProps & { children?: ReactNode };

/** Offset rows of nested open scallops, drawn as hairlines behind page content. */
export function ScallopArches({ className, style, palette, children, ...props }: ScallopArchesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
